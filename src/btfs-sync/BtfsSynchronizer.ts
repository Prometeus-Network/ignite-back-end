import {Injectable} from "@nestjs/common";
import {Cron, NestSchedule} from "nest-schedule";
import {LoggerService} from "nest-logger";
import {validate} from "class-validator";
import fileSystem from "fs";
import path from "path";
import graphicsMagic from "gm";
import FileTypeExtractor from "file-type";
import {BtfsHashRepository} from "./BtfsHashRepository";
import {BtfsHttpClient} from "./BtfsHttpClient";
import {BtfsHash} from "./entities";
import {BtfsMediaAttachment, BtfsStatus, BtfsStatusLike, BtfsUser, BtfsUserSubscription} from "./types/btfs-entities";
import {
    BtfsEntitiesResponse,
    BtfsImageEntityResponse,
    BtfsStatusEntityResponse,
    BtfsStatusLikeEntityResponse,
    BtfsStatusLikesResponse,
    BtfsUserEntityResponse,
    BtfsUserSubscriptionEntityResponse,
    BtfsUserSubscriptionsResponse
} from "./types/response";
import {asyncForEach} from "../utils/async-foreach";
import {User} from "../users/entities";
import {Status, StatusReferenceType} from "../statuses/entities";
import {StatusesRepository} from "../statuses/StatusesRepository";
import {StatusLikesRepository} from "../statuses/StatusLikesRepository";
import {UsersRepository} from "../users/UsersRepository";
import {UserSubscriptionsRepository} from "../user-subscriptions/UserSubscriptionsRepository";
import {MediaAttachment} from "../media-attachments/entities";
import {MediaAttachmentsRepository} from "../media-attachments/MediaAttachmentsRepository";
import {asyncMap} from "../utils/async-map";
import {UserSubscription} from "../user-subscriptions/entities";
import {config} from "../config";

interface BtfsEntityInfo {
    peerIp: string,
    peerWallet: string,
    btfsCid: string
}

type ObjectFromJsonConstructor<T> = new(json: T) => T

@Injectable()
export class BtfsSynchronizer extends NestSchedule {
    constructor(private readonly btfsHashRepository: BtfsHashRepository,
                private readonly statusesRepository: StatusesRepository,
                private readonly statusLikesRepository: StatusLikesRepository,
                private readonly usersRepository: UsersRepository,
                private readonly userSubscriptionsRepository: UserSubscriptionsRepository,
                private readonly mediaAttachmentsRepository: MediaAttachmentsRepository,
                private readonly btfsClient: BtfsHttpClient,
                private readonly log: LoggerService
    ) {
        super();
    }

    @Cron("*/10 * * * *", {waiting: true})
    public async synchronizeEntities(): Promise<void> {
        if (!config.ENABLE_BTFS_PULLING) {
            return;
        }

        this.log.info("Started synchronization with BTFS");
        const unsyncedBtfsCids: BtfsHash[] = await this.btfsHashRepository.findAllNotSynced();

        await asyncForEach(unsyncedBtfsCids, async btfsHash => {
            try {
                this.log.info(`Synchronizing with BTFS cid ${btfsHash.btfsCid}`);
                const entities = (await this.btfsClient.getEntitiesByCid(btfsHash.btfsCid)).data;
                const allJson = (await this.btfsClient.getAllJson(btfsHash.btfsCid)).data;
                const jsonNotInEntities = this.getJsonNotInEntities(allJson, entities);
                const users = entities.users || [];
                const images = entities.images || [];
                const statuses = entities.posts || [];
                const statusLikes = entities.likes || [];
                const subscriptions = entities.subscribes || [];
                const statusUnlikes = entities.unlikes || [];
                const unsubscriptions = entities.unsubscribes || [];

                const notSavedEntities = (await asyncMap(jsonNotInEntities, async json => {
                    return await this.getEntityFromJson(json, [
                        BtfsStatus,
                        BtfsStatusLike,
                        BtfsUserSubscription,
                        BtfsMediaAttachment,
                        BtfsUser
                    ]);
                }))
                    .filter(entity => Boolean(entity));

                await this.synchronizeEntitiesWhichWereNotSavedProperly(notSavedEntities, btfsHash.peerIp, btfsHash.peerWallet, btfsHash.btfsCid);
                await this.synchronizeImages(btfsHash.btfsCid, images);
                await this.synchronizeUsers(btfsHash.btfsCid, users);
                await this.synchronizeStatusLikes(btfsHash.btfsCid, statusLikes);
                await this.synchronizeStatuses(btfsHash.btfsCid, statuses);
                await this.synchronizeSubscriptions(btfsHash.btfsCid, subscriptions);
                await this.synchronizeUnlikes(btfsHash.btfsCid, statusUnlikes);
                await this.synchronizeUnsubscriptions(btfsHash.btfsCid, unsubscriptions);

                btfsHash.synced = true;
                await this.btfsHashRepository.save(btfsHash);
            } catch (error) {
                this.log.error(`Error occurred when tried to synchronize with BTFS cid ${btfsHash.btfsCid}`);
                console.log(error);
            }
        })
    }

    private async synchronizeEntitiesWhichWereNotSavedProperly(entities: any[], peerIp: string, peerWallet: string, btfsCid: string): Promise<void> {
        await asyncForEach(entities, async entity => {
            if (entity instanceof BtfsStatus) {
                await this.mergeStatus(await this.statusesRepository.findById(entity.id), entity, {
                    peerIp,
                    peerWallet,
                    btfsCid
                });
            } else if (entity instanceof BtfsStatusLike) {
                await this.saveBtfsStatusLike(entity, {peerIp, peerWallet, btfsCid});
            } else if (entity instanceof BtfsUserSubscription) {
                await this.mergeSubscription(await this.userSubscriptionsRepository.findById(entity.id), entity, {
                    peerIp,
                    peerWallet,
                    btfsCid
                });
            } else if (entity instanceof BtfsUser) {
                await this.mergeUser(await this.usersRepository.findById(entity.id), entity, {
                    peerIp,
                    peerWallet,
                    btfsCid
                })
            }
        })
    }

    private getJsonNotInEntities(allJson: any[], entities: BtfsEntitiesResponse): any[] {
        const jsonNotInEntities: any[] = [];

        allJson.forEach(json => {
            if (json.id) {
                if (!this.isJsonInEntities(json, entities)) {
                    jsonNotInEntities.push(json);
                }
            }
        });

        return jsonNotInEntities;
    }

    private isJsonInEntities(json: { id: any }, entities: BtfsEntitiesResponse): boolean {
        return (entities.posts && entities.posts.map(post => post.postId).includes(json.id))
            || (entities.likes && entities.likes.map(like => like.id).includes(json.id))
            || (entities.unlikes && entities.unlikes.map(unlike => unlike.id).includes(json.id))
            || (entities.images && entities.images.map(image => image.fileId).includes(json.id))
            || (entities.subscribes && entities.subscribes.map(subscribe => subscribe.id).includes(json.id))
            || (entities.unsubscribes && entities.unsubscribes.map(unsubscribe => unsubscribe.id).includes(json.id))
            || (entities.users && entities.users.map(user => user.userId).includes(json.id))
    }

    private async synchronizeImages(cid: string, btfsImages: BtfsImageEntityResponse[]): Promise<void> {
        await asyncForEach(btfsImages, async image => {
            const temporaryFilePath = path.join(config.MEDIA_ATTACHMENTS_DIRECTORY, `${image.fileId}.temporary`);
            await this.btfsClient.downloadFile({
                cid,
                id: image.fileId,
                path: temporaryFilePath
            });

            const file = await FileTypeExtractor.fromBuffer(fileSystem.readFileSync(temporaryFilePath));
            if (file.mime.startsWith("image")) {
                graphicsMagic(temporaryFilePath)
                    .size(async (error, size) => {
                        if (error) {
                            console.log(error);
                            throw error;
                        }

                        const permanentFilePath = path.join(config.MEDIA_ATTACHMENTS_DIRECTORY, `${image.fileId}.${file.ext}`);
                        fileSystem.renameSync(temporaryFilePath, permanentFilePath);
                        const mediaAttachment: MediaAttachment = {
                            id: image.fileId,
                            format: file.ext,
                            mimeType: file.mime,
                            height: size.height,
                            width: size.width,
                            name: `${image.fileId}.${file.ext}`,
                            btfsCid: cid,
                            peerIp: image.peerIp,
                            peerWallet: image.peerWallet
                        };
                        await this.mediaAttachmentsRepository.save(mediaAttachment);
                    })
            }
        })
    }

    private async getEntityFromJson(json: any, entityConstructors: Array<ObjectFromJsonConstructor<any>>): Promise<any | undefined> {
        for (const constructor of entityConstructors) {
            const entity = new constructor(json);
            if ((await validate(entity)).length === 0) {
                return entity;
            }
        }

        return undefined;
    }

    private async synchronizeUsers(cid: string, users: BtfsUserEntityResponse[]): Promise<void> {
        await asyncForEach(users, async btfsUser => {
            const user = new BtfsUser((await this.btfsClient.getUser({cid, userId: btfsUser.userId})).data);
            await this.mergeUser(
                await this.usersRepository.findById(btfsUser.userId),
                user,
                {
                    peerIp: btfsUser.peerIp,
                    peerWallet: btfsUser.peerWallet,
                    btfsCid: cid
                }
            )
        })
    }

    private async synchronizeStatuses(cid: string, statuses: BtfsStatusEntityResponse[]): Promise<void> {
        await asyncForEach(statuses, async btfsStatus => {
            const status = new BtfsStatus((await this.btfsClient.getStatusByCid({
                cid,
                statusId: btfsStatus.postId
            })).data);
            const errors = await validate(status);

            if (errors.length > 0) {
                console.log(errors);
                return;
            }

            await this.mergeStatus(
                await this.statusesRepository.findById(status.id),
                status,
                {peerIp: btfsStatus.peerIp, peerWallet: btfsStatus.peerWallet, btfsCid: cid}
            );
        });
    }

    private async synchronizeStatusLikes(cid: string, likes: BtfsStatusLikeEntityResponse[]): Promise<void> {
        await asyncForEach(likes, async likeData => {
            const btfsLikes: BtfsStatusLikesResponse = (await this.btfsClient.getStatusLikesByCid({
                commentId: likeData.commentId,
                cid
            })).data;
            const likesIds = Object.keys(btfsLikes);

            await asyncForEach(likesIds, async likeId => {
                const btfsLike: BtfsStatusLike = new BtfsStatusLike(btfsLikes[likeId]);
                const errors = await validate(btfsLike);

                if (errors.length > 0) {
                    console.log(errors);
                    return;
                }

                await this.saveBtfsStatusLike(btfsLike, {
                    peerIp: likeData.peerIp,
                    peerWallet: likeData.peerWallet,
                    btfsCid: cid
                });
            })
        })
    }

    private async saveBtfsStatusLike(btfsStatusLike: BtfsStatusLike, btfsEntityInfo: BtfsEntityInfo): Promise<void> {
        let statusLike = await this.statusLikesRepository.findById(btfsStatusLike.id);

        if (!statusLike) {
            const user = await this.mergeUser(await this.usersRepository.findById(btfsStatusLike.user.id), btfsStatusLike.user);
            const status = await this.mergeStatus(
                await this.statusesRepository.findById(btfsStatusLike.status.id),
                btfsStatusLike.status,
                btfsEntityInfo
            );
            statusLike = {
                id: btfsStatusLike.id,
                user,
                status,
                createdAt: new Date(btfsStatusLike.createdAt),
                btfsHash: btfsEntityInfo.btfsCid,
                peerIp: btfsEntityInfo.peerIp,
                peerWallet: btfsEntityInfo.peerWallet,
                reverted: false,
                revertedAt: null
            };

            let existingLike = await this.statusLikesRepository.findByStatusAndUserNotReverted(status, user);

            if (existingLike) {
                existingLike = {
                    ...existingLike,
                    ...statusLike
                };
                this.log.info("Updating existing status like");
                await this.statusLikesRepository.save(existingLike);
            } else {
                await this.statusLikesRepository.save(statusLike);
            }
        } else if (!statusLike.btfsHash) {
            statusLike.btfsHash = btfsEntityInfo.btfsCid;
            statusLike.peerWallet = btfsEntityInfo.peerWallet;
            statusLike.peerIp = btfsEntityInfo.peerIp;
            await this.statusLikesRepository.save(statusLike);
        }
    }

    private async synchronizeSubscriptions(cid: string, subscriptions: BtfsUserSubscriptionEntityResponse[]): Promise<void> {
        await asyncForEach(subscriptions, async subscriptionData => {
            const subscriptionsMap = (await this.btfsClient.getUserSubscriptionsByCid({
                cid,
                userId: subscriptionData.userId
            })).data;
            const subscriptionIds = Object.keys(subscriptionsMap);

            await asyncForEach(subscriptionIds, async subscriptionId => {
                const btfsUserSubscription = new BtfsUserSubscription(subscriptionsMap[subscriptionId]);
                const errors = await validate(btfsUserSubscription);

                if (errors.length > 0) {
                    console.log(errors);
                    return;
                }

                await this.mergeSubscription(
                    await this.userSubscriptionsRepository.findById(btfsUserSubscription.id),
                    btfsUserSubscription,
                    {peerWallet: subscriptionData.peerWallet, btfsCid: cid, peerIp: subscriptionData.peerIp}
                )
            })
        })
    }

    private async mergeStatus(status: Status | undefined, btfsStatus: BtfsStatus, btfsEntityInfo: BtfsEntityInfo): Promise<Status> {
        if (!status) {
            const mediaAttachments = await asyncMap(
                btfsStatus.mediaAttachments,
                async btfsMediaAttachment => {
                    return await this.mergeMediaAttachment(
                        await this.mediaAttachmentsRepository.findById(btfsMediaAttachment.id),
                        btfsMediaAttachment,
                        btfsEntityInfo
                    );
                }
            );
            const author = await this.mergeUser(await this.usersRepository.findById(btfsStatus.author.id), btfsStatus.author);
            let referredStatus: Status | undefined;
            let statusReferenceType: StatusReferenceType | undefined;

            if (btfsStatus.referredStatusId) {
                referredStatus = await this.statusesRepository.findById(btfsStatus.id);
                statusReferenceType = btfsStatus.statusReferenceType || StatusReferenceType.REPOST;
            }

            status = {
                ...btfsStatus,
                author,
                mediaAttachments,
                createdAt: new Date(btfsStatus.createdAt),
                updatedAt: undefined,
                remote: true,
                btfsHash: btfsEntityInfo.btfsCid,
                referredStatus: referredStatus ? referredStatus : null,
                statusReferenceType,
                peerWallet: btfsEntityInfo.peerWallet,
                peerIp: btfsEntityInfo.peerIp,
                hashTags: [],
                favoritesCount: status.favoritesCount,
                repostsCount: status.repostsCount
            };
            status = await this.statusesRepository.save(status);
        } else {
            if (!status.btfsHash) {
                status.btfsHash = btfsEntityInfo.btfsCid;
                status.peerIp = btfsEntityInfo.peerIp;
                status.peerWallet = btfsEntityInfo.peerWallet;
                status = await this.statusesRepository.save(status);
            }
        }

        return status;
    }

    private async mergeUser(user: User | undefined, btfsUser: BtfsUser, btfsEntityInfo?: BtfsEntityInfo): Promise<User> {
        if (!user) {
            user = {
                ...btfsUser,
                remote: true,
                username: btfsUser.username ? btfsUser.username : btfsUser.address,
                ethereumAddress: btfsUser.address,
                createdAt: new Date(btfsUser.createdAt)
            };
            user = await this.usersRepository.save(user);
        } else {
            if (!user.btfsHash || !user.btfsCid) {
                user = {
                    ...user,
                    btfsHash: btfsEntityInfo.btfsCid,
                    btfsCid: btfsEntityInfo.btfsCid,
                    peerIp: btfsEntityInfo.peerIp,
                    peerWallet: btfsEntityInfo.peerWallet
                };
                user = await this.usersRepository.save(user);
            }
        }

        return user;
    }

    private async mergeMediaAttachment(
        mediaAttachment: MediaAttachment | undefined,
        btfsMediaAttachment: BtfsMediaAttachment,
        btfsEntityInfo: BtfsEntityInfo
    ): Promise<MediaAttachment> {
        if (mediaAttachment) {
            return mediaAttachment;
        } else {
            mediaAttachment = {
                ...btfsMediaAttachment,
                name: `${btfsMediaAttachment.id}.${btfsMediaAttachment.format}`,
                siaLink: btfsMediaAttachment.siaLink,
                peerWallet: btfsEntityInfo.peerWallet,
                peerIp: btfsEntityInfo.peerIp,
                btfsCid: btfsEntityInfo.btfsCid
            };
            mediaAttachment = await this.mediaAttachmentsRepository.save(mediaAttachment);
            return mediaAttachment;
        }
    }

    private async mergeSubscription(
        userSubscription: UserSubscription | undefined,
        btfsUserSubscription: BtfsUserSubscription,
        btfsEntityInfo: BtfsEntityInfo
    ): Promise<UserSubscription> {
        if (userSubscription) {
            if (!userSubscription.btfsHash) {
                userSubscription.btfsHash = btfsEntityInfo.btfsCid;
                userSubscription.peerIp = btfsEntityInfo.peerIp;
                userSubscription.peerWallet = btfsEntityInfo.peerWallet;
                userSubscription = await this.userSubscriptionsRepository.save(userSubscription);
            }

            return userSubscription;
        } else {
            const subscribedUser = await this.mergeUser(
                await this.usersRepository.findById(btfsUserSubscription.subscribedUser.id),
                btfsUserSubscription.subscribedUser
            );
            const subscribedTo = await this.mergeUser(
                await this.usersRepository.findById(btfsUserSubscription.subscribedTo.id),
                btfsUserSubscription.subscribedTo
            );
            userSubscription = {
                id: btfsUserSubscription.id,
                subscribedUser,
                subscribedTo,
                btfsHash: btfsEntityInfo.btfsCid,
                createdAt: new Date(btfsUserSubscription.createdAt),
                peerWallet: btfsEntityInfo.peerWallet,
                peerIp: btfsEntityInfo.peerIp,
                reverted: false,
                revertedAt: null
            };

            const existingSubscription = await this.userSubscriptionsRepository.findBySubscribedUserAndSubscribedToNotReverted(
                subscribedUser,
                subscribedTo
            );

            if (existingSubscription) {
                this.log.info("Deleting existing subscription");
                await this.userSubscriptionsRepository.delete(existingSubscription);
            }

            userSubscription = await this.userSubscriptionsRepository.save(userSubscription);
            return userSubscription;
        }
    }

    private async synchronizeUnlikes(cid: string, unlikes: BtfsStatusLikeEntityResponse[]): Promise<void> {
        await asyncForEach(unlikes, async unlikeData => {
            const btfsUnlike: BtfsStatusLikesResponse = (await this.btfsClient.getStatusUnlikesByCid({
                commentId: unlikeData.commentId,
                cid
            })).data;
            const deletedLikesIds = Object.keys(btfsUnlike);

            await asyncForEach(deletedLikesIds, async deletedLikeId => {
                const deletedLike = await this.statusLikesRepository.findById(deletedLikeId);

                if (deletedLike) {
                    deletedLike.saveUnlikeToBtfs = false;
                    if (!deletedLike.btfsHash) {
                        deletedLike.btfsHash = cid;
                    }
                    deletedLike.reverted = true;
                    deletedLike.revertedAt = new Date();
                    await this.statusLikesRepository.save(deletedLike);
                }
            })
        })
    }

    private async synchronizeUnsubscriptions(cid: string, unsubscriptions: BtfsUserSubscriptionEntityResponse[]): Promise<void> {
        await asyncForEach(unsubscriptions, async unsubscriptionData => {
            const btfsUnsubscriptions: BtfsUserSubscriptionsResponse = (await this.btfsClient
                .getUserUnsubscriptionsByCid({userId: unsubscriptionData.userId, cid}))
                .data;
            const deletedSubscriptionIds = Object.keys(btfsUnsubscriptions);

            await asyncForEach(deletedSubscriptionIds, async deletedSubscriptionId => {
                const deletedSubscription = await this.userSubscriptionsRepository.findById(deletedSubscriptionId);

                if (deletedSubscription && !deletedSubscription.reverted) {
                    deletedSubscription.saveUnsubscriptionToBtfs = false;
                    deletedSubscription.reverted = true;
                    deletedSubscription.revertedAt = new Date();
                    await this.userSubscriptionsRepository.save(deletedSubscription);
                }
            })
        })
    }
}
