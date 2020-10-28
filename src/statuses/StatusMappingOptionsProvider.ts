import {Injectable} from "@nestjs/common";
import {Status, StatusAdditionalInfo, StatusReferenceType} from "./entities";
import {ToStatusResponseOptions} from "./StatusesMapper";
import {StatusesRepository} from "./StatusesRepository";
import {StatusLikesRepository} from "./StatusLikesRepository";
import {UserStatisticsRepository} from "../users/UserStatisticsRepository";
import {UserSubscriptionsRepository} from "../user-subscriptions/UserSubscriptionsRepository";
import {User} from "../users/entities";
import {BtfsHashRepository} from "../btfs-sync/BtfsHashRepository";

@Injectable()
export class StatusMappingOptionsProvider {
    constructor(private readonly statusesRepository: StatusesRepository,
                private readonly statusLikesRepository: StatusLikesRepository,
                private readonly userSubscriptionsRepository: UserSubscriptionsRepository,
                private readonly userStatisticsRepository: UserStatisticsRepository,
                private readonly btfsHashRepository: BtfsHashRepository) {

    }

    public async getStatusMappingOptionsByStatusInfo(
        status: Status,
        statusInfo: StatusAdditionalInfo,
        mapReferredStatusOptions?: ToStatusResponseOptions
    ): Promise<ToStatusResponseOptions> {
        const favourited = statusInfo.likedByCurrentUser;
        const followingAuthor = statusInfo.currentUserFollowsAuthor;
        const followedByAuthor = statusInfo.currentUserFollowedByAuthor;
        const userStatistics = status.author.statistics!;
        const commentsCount = statusInfo.commentsCount;
        let canBeReposted = !statusInfo.repostedByCurrentUser;
        const reposted = statusInfo.repostedByCurrentUser;
        const commented = statusInfo.commentedByCurrentUser;

        if (statusInfo.referredStatusRepostedByCurrentUser) {
            canBeReposted = canBeReposted && (
                !((!Boolean(status.text) || status.text.trim().length === 0) && status.mediaAttachments.length === 0)
            )
        }

        return {
            status,
            favourited,
            followedByAuthor,
            followingAuthor,
            userStatistics,
            commentsCount,
            canBeReposted,
            mapReferredStatus: Boolean(mapReferredStatusOptions),
            referredStatusOptions: mapReferredStatusOptions,
            reposted,
            commented
        }
    }

    public async getStatusMappingOptions(
        status: Status,
        mapReferredStatusOptions?: ToStatusResponseOptions,
        currentUser?: User,
    ): Promise<ToStatusResponseOptions> {
        const likesCount = await this.statusLikesRepository.countByStatus(status);
        let likedByCurrentUser = false;

        if (likesCount !== 0 && currentUser) {
            likedByCurrentUser = await this.statusLikesRepository.existByStatusAndUserNotReverted(status, currentUser);
        }

        const followingAuthor = currentUser && await this.userSubscriptionsRepository.existsBySubscribedUserAndSubscribedToNotReverted(
            currentUser, status.author
        );
        const followedByAuthor = currentUser && await this.userSubscriptionsRepository.existsBySubscribedUserAndSubscribedToNotReverted(
            status.author, currentUser
        );
        const userStatistics = await this.userStatisticsRepository.findByUser(status.author);
        const repostsCount = await this.statusesRepository.countReposts(status);
        const commentsCount = await this.statusesRepository.countComments(status);
        const btfsHash = status.btfsHash && await this.btfsHashRepository.findByBtfsCid(status.btfsHash);
        const commented = Boolean(currentUser && await this.statusesRepository.existByReferredStatusAndReferenceTypeAndAuthor(
            status,
            StatusReferenceType.COMMENT,
            currentUser
        ));
        const reposted = Boolean(currentUser && await this.statusesRepository.existByReferredStatusAndReferenceTypeAndAuthor(
            status,
            StatusReferenceType.REPOST,
            currentUser
        ));
        let canBeReposted = !reposted;

        if (status.referredStatus) {
            canBeReposted = canBeReposted && currentUser
                && await this.statusesRepository.existByReferredStatusAndReferenceTypeAndAuthor(
                    status.referredStatus,
                    StatusReferenceType.REPOST,
                    currentUser
                )
                && !((!Boolean(status.text) || status.text.trim().length === 0) && status.mediaAttachments.length === 0)
        }

        return {
            status,
            favourited: likedByCurrentUser,
            followedByAuthor,
            followingAuthor,
            mapReferredStatus: Boolean(mapReferredStatusOptions),
            referredStatusOptions: mapReferredStatusOptions,
            userStatistics,
            commentsCount,
            btfsHash: btfsHash && btfsHash.peerIp && btfsHash.peerWallet ? btfsHash : null,
            canBeReposted,
            reposted,
            commented
        }
    }
}
