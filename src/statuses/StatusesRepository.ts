import { MEMEZATOR_HASHTAG } from "./../common/constants";
import {Between, EntityRepository, In, LessThan, MoreThan, Repository, SelectQueryBuilder} from "typeorm";
import {subDays} from "date-fns";
import {HashTag, Status, StatusAdditionalInfo, StatusInfoMap, StatusLike, StatusReferenceType} from "./entities";
import {Language, User} from "../users/entities";
import {calculateOffset, PaginationRequest} from "../utils/pagination";
import {UserSubscription} from "../user-subscriptions/entities";
import { getCurrentMemezatorContestStartTime } from "../memezator/utils";

@EntityRepository(Status)
export class StatusesRepository extends Repository<Status> {
    public async findByAuthor(author: User, paginationRequest: PaginationRequest): Promise<Status[]> {
        return await this.find({
            where: {
                author
            },
            order: {
                createdAt: "DESC"
            },
            skip: calculateOffset(paginationRequest.page, paginationRequest.pageSize),
            take: paginationRequest.pageSize,
            relations: ["referredStatus"]
        });
    }

    public async findById(id: string): Promise<Status | undefined> {
        return this.findOne({
            where: {
                id
            },
            relations: ["referredStatus"]
        })
    }

    public async findAllBy(paginationRequest: PaginationRequest): Promise<Status[]> {
        return this.find({
            skip: calculateOffset(paginationRequest.page, paginationRequest.pageSize),
            take: paginationRequest.pageSize,
            order: {
                createdAt: "DESC"
            },
            relations: ["referredStatus"]
        })
    }

    public async findByAuthorAndCreatedAtBefore(author: User, createdAt: Date, paginationRequest: PaginationRequest): Promise<Status[]> {
        return this.find({
            where: {
                author,
                createdAt: LessThan(createdAt)
            },
            order: {
                createdAt: "DESC"
            },
            skip: calculateOffset(paginationRequest.page, paginationRequest.pageSize),
            take: paginationRequest.pageSize,
            relations: ["referredStatus"]
        })
    }

    public async findByAuthorAndCreatedAtAfter(author: User, createdAt: Date, paginationRequest: PaginationRequest): Promise<Status[]> {
        return this.find({
            where: {
                author,
                createdAt: MoreThan(createdAt)
            },
            order: {
                createdAt: "DESC"
            },
            skip: calculateOffset(paginationRequest.page, paginationRequest.pageSize),
            take: paginationRequest.pageSize,
            relations: ["referredStatus"]
        })
    }

    public async findByAuthorAndCreatedAtBetween(
        author: User,
        createdAtBefore: Date,
        createdAtAfter: Date,
        paginationRequest: PaginationRequest
    ): Promise<Status[]> {
        return this.find({
            where: {
                author,
                createdAt: Between(createdAtBefore, createdAtAfter)
            },
            order: {
                createdAt: "DESC"
            },
            skip: calculateOffset(paginationRequest.page, paginationRequest.pageSize),
            take: paginationRequest.pageSize,
            relations: ["referredStatus"]
        })
    }

    public findByAuthorIn(authors: User[], paginationRequest: PaginationRequest): Promise<Status[]> {

        return this.find({
            where: {
                author: {
                    id: In(authors.map(author => author.id))
                },
            },
            order: {
                createdAt: "DESC"
            },
            skip: calculateOffset(paginationRequest.page, paginationRequest.pageSize),
            take: paginationRequest.pageSize,
            relations: ["referredStatus"]
        })
    }

    public findByAuthorInAndHashTagsIn(authors: User[], hashTags: HashTag[], paginationRequest: PaginationRequest): Promise<Status[]> {
        if (hashTags.length === 0) {
            return this.findByAuthorIn(authors, paginationRequest);
        }

        return this.createStatusQueryBuilder()
            .where(`status."authorId" in (:...authors) `, {authors: authors.map(user => user.id)})
            .orWhere(`"status_filteredHashTag"."hashTagId" in (:...hashTags)`, {hashTags: hashTags.map(hashTag => hashTag.id)})
            .orderBy(`status."createdAt"`, "DESC")
            .offset(calculateOffset(paginationRequest.page, paginationRequest.pageSize))
            .limit(paginationRequest.pageSize)
            .getMany();
    }

    public findByAuthorInAndCreatedAfter(authors: User[], createdAt: Date, paginationRequest: PaginationRequest): Promise<Status[]> {
        return this.find({
            where: {
                author: {
                    id: In(authors.map(author => author.id))
                },
                createdAt: MoreThan(createdAt)
            },
            order: {
                createdAt: "DESC"
            },
            skip: calculateOffset(paginationRequest.page, paginationRequest.pageSize),
            take: paginationRequest.pageSize,
            relations: ["referredStatus"]
        })
    }

    public findByAuthorInAndHashTagsInAndCreatedAtAfter(
        authors: User[],
        hashTags: HashTag[],
        createdAt: Date,
        paginationRequest: PaginationRequest
    ): Promise<Status[]> {
        if (hashTags.length === 0) {
            return this.findByAuthorInAndCreatedAfter(authors, createdAt, paginationRequest);
        }

        return this.createStatusQueryBuilder()
            .where(
                `(status."authorId" in (:...authors) or "status_filteredHashTag"."hashTagId" in (:...hashTags))`,
                {
                    authors: authors.map(user => user.id),
                    hashTags: hashTags.map(hashTag => hashTag.id)
                })
            .andWhere(`status."createdAt" > :createdAt`, {createdAt})
            .orderBy(`status."createdAt"`, "DESC")
            .offset(calculateOffset(paginationRequest.page, paginationRequest.pageSize))
            .limit(paginationRequest.pageSize)
            .getMany();
    }

    public findByAuthorInAndCreatedAtBefore(authors: User[], createdAt: Date, paginationRequest: PaginationRequest): Promise<Status[]> {
        return this.find({
            where: {
                author: {
                    id: In(authors.map(author => author.id))
                },
                createdAt: LessThan(createdAt)
            },
            order: {
                createdAt: "DESC"
            },
            skip: calculateOffset(paginationRequest.page, paginationRequest.pageSize),
            take: paginationRequest.pageSize,
            relations: ["referredStatus"]
        })
    }

    public findByAuthorInAndHashTagsInAndCreatedAtBefore(
        authors: User[],
        hashTags: HashTag[],
        createdAt: Date,
        paginationRequest: PaginationRequest
    ): Promise<Status[]> {
        if (hashTags.length === 0) {
            return this.findByAuthorInAndCreatedAtBefore(authors, createdAt, paginationRequest);
        }

        return this.createStatusQueryBuilder()
            .where(
                `(status."authorId" in (:...authors) or "status_filteredHashTag"."hashTagId" in (:...hashTags))`,
                {
                    authors: authors.map(user => user.id),
                    hashTags: hashTags.map(hashTag => hashTag.id)
                })
            .andWhere(`status."createdAt" < :createdAt`, {createdAt})
            .orderBy(`status."createdAt"`, "DESC")
            .offset(calculateOffset(paginationRequest.page, paginationRequest.pageSize))
            .limit(paginationRequest.pageSize)
            .getMany()
    }

    public findByAuthorInAndCreatedAtBetween(
        authors: User[],
        createdAtBefore: Date,
        createdAtAfter: Date,
        paginationRequest: PaginationRequest
    ): Promise<Status[]> {
        return this.find({
            where: {
                author: {
                    id: In(authors.map(author => author.id))
                },
                createdAt: Between(createdAtAfter, createdAtBefore)
            },
            order: {
                createdAt: "DESC"
            },
            skip: calculateOffset(paginationRequest.page, paginationRequest.pageSize),
            take: paginationRequest.pageSize,
            relations: ["referredStatus"]
        })
    }

    public async findOneMemeByAuthorCreatedToday(user: User): Promise<Status> {
        const currentMemezatorContestStartTime = getCurrentMemezatorContestStartTime()

        return this.createStatusQueryBuilder()
            .where(`"filteredHashTag"."name" = :hashTag`, {hashTag: MEMEZATOR_HASHTAG})
            .andWhere(`status."authorId" = :userId`, {userId: user.id})
            .andWhere(`status."createdAt" >= :createdAtAfter`, { createdAtAfter: currentMemezatorContestStartTime })
            .getOne()
    }

    public async countMemesCreatedToday(): Promise<number> {
        const currentMemezatorContestStartTime = getCurrentMemezatorContestStartTime()

        return this.createQueryBuilder("status")
            .leftJoinAndSelect("status.hashTags", "filteredHashTag")
            .where(`"filteredHashTag"."name" = :hashTag`, {hashTag: MEMEZATOR_HASHTAG})
            .andWhere(`status."createdAt" >= :createdAtAfter`, { createdAtAfter: currentMemezatorContestStartTime })
            .getCount()
    }

    public countStatusesCreatedTodayByAuthor(author: User): Promise<number> {
        const dayAgo = subDays(new Date(), 1)

        return this.count({
            where: {
                author,
                createdAt: MoreThan(dayAgo),
            }
        })
    }

    public findByAuthorInAndHashTagsInAndCreatedAtBetween(
        authors: User[],
        hashTags: HashTag[],
        createdAtBefore: Date,
        createdAtAfter: Date,
        paginationRequest: PaginationRequest
    ): Promise<Status[]> {
        if (hashTags.length === 0) {
            return this.findByAuthorInAndCreatedAtBetween(
                authors,
                createdAtBefore,
                createdAtAfter,
                paginationRequest
            );
        }

        return this.createStatusQueryBuilder()
            .where(
                `(status."authorId" in (:...authors) or "status_filteredHashTag"."hashTagId" in (:...hashTags))`,
                {
                    authors: authors.map(user => user.id),
                    hashTags: hashTags.map(hashTag => hashTag.id)
                })
            .andWhere(`status."createdAt" between(:createdAtBefore, :createdAtAfter)`, {createdAtBefore, createdAtAfter})
            .orderBy(`status."createdAt"`, "DESC")
            .offset(calculateOffset(paginationRequest.page, paginationRequest.pageSize))
            .limit(paginationRequest.pageSize)
            .getMany()
    }

    public findByCreatedAtBefore(createdAtBefore: Date, paginationRequest: PaginationRequest): Promise<Status[]> {
        return this.find({
            where: {
                createdAt: LessThan(createdAtBefore)
            },
            order: {
                createdAt: "DESC"
            },
            skip: calculateOffset(paginationRequest.page, paginationRequest.pageSize),
            take: paginationRequest.pageSize,
            relations: ["referredStatus"]
        })
    }

    public findAllByCreatedAtAfter(createdAtAfter: Date): Promise<Status[]> {
        return this.find({
            where: {
                createdAt: MoreThan(createdAtAfter)
            }
        });
    }

    public findByCreatedAtAfter(createdAtAfter: Date, paginationRequest: PaginationRequest): Promise<Status[]> {
        return this.find({
            where: {
                createdAt: MoreThan(createdAtAfter)
            },
            order: {
                createdAt: "DESC"
            },
            skip: calculateOffset(paginationRequest.page, paginationRequest.pageSize),
            take: paginationRequest.pageSize,
            relations: ["referredStatus"]
        })
    }

    public findByCreatedAtBetween(createdAtBefore: Date, createdAtAfter: Date, paginationRequest: PaginationRequest): Promise<Status[]> {
        return this.find({
            where: {
                createdAt: Between(createdAtAfter, createdAtBefore)
            },
            order: {
                createdAt: "DESC"
            },
            skip: calculateOffset(paginationRequest.page, paginationRequest.pageSize),
            take: paginationRequest.pageSize,
            relations: ["referredStatus"]
        })
    }

    public findByReferredStatusAndStatusReferenceType(referredStatus: Status,
                                                      statusReferenceType: StatusReferenceType,
                                                      paginationRequest: PaginationRequest,
                                                      sortingDirection: "ASC" | "DESC"
    ): Promise<Status[]> {
        return this.find({
            where: {
                referredStatus,
                statusReferenceType
            },
            order: {
                createdAt: sortingDirection
            },
            skip: calculateOffset(paginationRequest.page, paginationRequest.pageSize),
            take: paginationRequest.pageSize,
            relations: ["referredStatus"]
        })
    }

    public findByReferredStatusAndStatusReferenceTypeAndCreatedAtBefore(
        referredStatus: Status,
        statusReferenceType: StatusReferenceType,
        createdAtBefore: Date,
        paginationRequest: PaginationRequest,
        sortingDirection: "ASC" | "DESC"
    ): Promise<Status[]> {
        return this.find({
            where: {
                referredStatus,
                statusReferenceType,
                createdAt: LessThan(createdAtBefore)
            },
            order: {
                createdAt: sortingDirection
            },
            skip: calculateOffset(paginationRequest.page, paginationRequest.pageSize),
            take: paginationRequest.pageSize,
            relations: ["referredStatus"]
        })
    }

    public findByReferredStatusAndStatusReferenceTypeAndCreatedAtAfter(
        referredStatus: Status,
        statusReferenceType: StatusReferenceType,
        createdAtAfter: Date,
        paginationRequest: PaginationRequest,
        sortingDirection: "ASC" | "DESC"
    ): Promise<Status[]> {
        return this.find({
            where: {
                referredStatus,
                statusReferenceType,
                createdAt: MoreThan(createdAtAfter)
            },
            order: {
                createdAt: sortingDirection
            },
            skip: calculateOffset(paginationRequest.page, paginationRequest.pageSize),
            take: paginationRequest.pageSize,
            relations: ["referredStatus"]
        })
    }

    public findByReferredStatusAndStatusReferenceTypeAndCreatedAtBetween(
        referredStatus: Status,
        statusReferenceType: StatusReferenceType,
        createdAtBefore: Date,
        createdAtAfter: Date,
        paginationRequest: PaginationRequest,
        sortingDirection: "ASC" | "DESC"
    ): Promise<Status[]> {
        return this.find({
            where: {
                referredStatus,
                statusReferenceType,
                createdAt: Between(createdAtBefore, createdAtAfter)
            },
            order: {
                createdAt: sortingDirection
            },
            skip: calculateOffset(paginationRequest.page, paginationRequest.pageSize),
            take: paginationRequest.pageSize,
            relations: ["referredStatus"]
        })
    }

    public countReposts(repostedStatus: Status): Promise<number> {
        return this.countByReferredStatusAndStatusReferenceType(repostedStatus, StatusReferenceType.REPOST);
    }

    public countComments(commentedStatus: Status): Promise<number> {
        return this.countByReferredStatusAndStatusReferenceType(commentedStatus, StatusReferenceType.COMMENT);
    }

    public countByReferredStatusAndStatusReferenceType(referredStatus: Status, statusReferenceType: StatusReferenceType): Promise<number> {
        return this.count({
            where: {
                referredStatus,
                statusReferenceType
            }
        })
    }

    public async existByReferredStatusAndReferenceTypeAndAuthor(
        referredStatus: Status,
        statusReferenceType: StatusReferenceType,
        author: User
    ): Promise<boolean> {
        return (await this.count({
            where: {
                referredStatus,
                statusReferenceType,
                author
            }
        })) !== 0
    }

    public countByRepostedStatus(repostedStatus: Status): Promise<number> {
        return this.count({
            where: {
                referredStatus: repostedStatus,
                statusReferenceType: StatusReferenceType.REPOST
            }
        })
    }

    public findAncestorsOfStatus(status: Status): Promise<Status[]> {
        const treeRepository = this.manager.getTreeRepository<Status>(Status);
        return treeRepository.findAncestors(status);
    }

    public async getStatusesAdditionalInfoMap(statuses: Status[], currentUser?: User): Promise<StatusInfoMap> {
        if (statuses.length === 0) {
            return {};
        }

        const statusesIds = [];

        statuses.forEach(status => {
            statusesIds.push(status.id);

            if (status.referredStatus) {
                statusesIds.push(status.referredStatus.id);
            }
        });

        const statusInfoList = await this.findStatusInfoByStatusIdIn(statusesIds, currentUser);

        const statusInfoMap: StatusInfoMap = {};

        statusInfoList.forEach(statusInfo => statusInfoMap[statusInfo.id] = statusInfo);

        return statusInfoMap;
    };

    public async findStatusInfoByStatusIdIn(ids: string[], currentUser?: User): Promise<StatusAdditionalInfo[]> {
        let queryBuilder = this.createQueryBuilder("status");

        queryBuilder = queryBuilder
            .select("status.id")
            .where({
                id: In(ids)
            })
            .addSelect(
                subquery => subquery
                    .select("count(distinct(id))", "likes_count")
                    .from(StatusLike, "status_like")
                    .where(`status_like."statusId" = status.id`)
            )
            .addSelect(
                subquery => subquery
                    .select("count(distinct(id))", "comments_count")
                    .from(Status, "compared_status")
                    .where(`"referredStatusId" = status.id`)
                    .andWhere(`"statusReferenceType" = 'COMMENT'`)
            )
            .addSelect(
                subquery => subquery
                    .select("count(distinct(id))", "reposts_count")
                    .from(Status, "compared_status")
                    .where(`"referredStatusId" = status.id`)
                    .andWhere(`"statusReferenceType" = 'REPOST'`)
            );

        if (currentUser) {
            queryBuilder = queryBuilder
                .addSelect(
                    subquery => subquery
                        .select("count(distinct(id))", "current_user_likes_count")
                        .from(StatusLike, "status_like")
                        .where(`status_like."userId" = :currentUserId`, {currentUserId: currentUser.id})
                        .andWhere(`status_like."statusId" = status.id`)
            )
                .addSelect(
                    subquery => subquery
                        .select("count(distinct(id))", "current_user_comments_count")
                        .from(Status, "compared_status")
                        .where(`"authorId" = :currentUserId`, {currentUserId: currentUser.id})
                        .andWhere(`"referredStatusId" is not null`)
                        .andWhere(`"referredStatusId" = status.id`)
                        .andWhere(`"statusReferenceType" = 'COMMENT'`)
                )
                .addSelect(
                    subquery => subquery
                        .select("count(distinct(id))", "current_user_reposts_count")
                        .from(Status, "compared_status")
                        .where(`"authorId" = :currentUserId`, {currentUserId: currentUser.id})
                        .andWhere(`"referredStatusId" is not null`)
                        .andWhere(`"referredStatusId" = status.id`)
                        .andWhere(`"statusReferenceType" = 'REPOST'`)
                )
                .addSelect(
                    subquery => subquery
                        .select("count(distinct(id))", "current_user_referred_status_reposts_count")
                        .from(Status, "compared_status")
                        .where(`"authorId" = :currentUserId`, {currentUserId: currentUser.id})
                        .andWhere(`"referredStatusId" is not null`)
                        .andWhere(`"referredStatusId" = status."referredStatusId"`)
                        .andWhere(`"statusReferenceType" = 'REPOST'`)
                )
                .addSelect(
                    subquery => subquery
                        .select("count(distinct(id))", "subscriptions_of_current_user_to_status_author_count")
                        .from(UserSubscription, "user_subscription")
                        .where(`user_subscription."subscribedToId" = status."authorId"`)
                        .andWhere(`user_subscription."subscribedUserId" = :currentUserId`, {currentUserId: currentUser.id})
                        .andWhere("reverted = false")
                )
                .addSelect(
                    subquery => subquery
                        .select("count(distinct(id))", "subscriptions_of_status_author_to_current_user_count")
                        .from(UserSubscription, "user_subscription")
                        .where(`user_subscription."subscribedToId" = :currentUserId`, {currentUserId: currentUser.id})
                        .andWhere(`user_subscription."subscribedUserId" = status."authorId"`)
                        .andWhere("reverted = false")
                )
        }

        const rawResults: any[] = await queryBuilder.getRawMany();

        return rawResults.map(raw => ({
            id: raw.status_id as string,
            commentsCount: Number(raw.comments_count),
            likesCount: Number(raw.likes_count),
            repostsCount: Number(raw.reposts_count),
            currentUserFollowsAuthor: currentUser && Boolean(Number(raw.subscriptions_of_current_user_to_status_author_count)),
            currentUserFollowedByAuthor: currentUser && Boolean(Number(raw.subscriptions_of_status_author_to_current_user_count)),
            likedByCurrentUser: currentUser && Boolean(Number(raw.current_user_likes_count)),
            commentedByCurrentUser: currentUser && Boolean(Number(raw.current_user_comments_count)),
            repostedByCurrentUser: currentUser && Boolean(Number(raw.current_user_reposts_count)),
            referredStatusRepostedByCurrentUser: currentUser && Boolean(Number(raw.current_user_referred_status_reposts_count))
        }))
    }

    public findAllByIds(ids: string[]): Promise<Status[]> {
        return this.find({
            where: {
                id: In(ids),
            },
            order: {
                createdAt: "DESC",
            },
            relations: ["referredStatus"]
        })
    }

    public async findByHashTag(hashTag: HashTag, paginationRequest: PaginationRequest): Promise<Status[]> {
        return this.createStatusQueryBuilder()
            .where(`"status_filteredHashTag"."hashTagId" in (:...hashTags)`, {hashTags: [hashTag.id]})
            .orderBy(`status."createdAt"`, "DESC")
            .offset(calculateOffset(paginationRequest.page, paginationRequest.pageSize))
            .limit(paginationRequest.pageSize)
            .getMany()

    }

    public async findByHashTagAndCreatedAtBefore(
        hashTag: HashTag,
        createdAtBefore: Date,
        paginationRequest: PaginationRequest
    ): Promise<Status[]> {
        return this.createStatusQueryBuilder()
            .where(`"status_filteredHashTag"."hashTagId" in (:...hashTags)`, {hashTags: [hashTag.id]})
            .andWhere(`status."createdAt" < :createdAt`, {createdAt: createdAtBefore})
            .orderBy(`status."createdAt"`, "DESC")
            .offset(calculateOffset(paginationRequest.page, paginationRequest.pageSize))
            .limit(paginationRequest.pageSize)
            .getMany();
    }

    public async findByHashTagAndCreatedAtAfter(
        hashTag: HashTag,
        createdAtAfter: Date,
        paginationRequest?: PaginationRequest
    ): Promise<Status[]> {
        const qb = this.createStatusQueryBuilder()
            .where(`"status_filteredHashTag"."hashTagId" in (:...hashTags)`, {hashTags: [hashTag.id]})
            .andWhere(`status."createdAt" > :createdAt`, {createdAt: createdAtAfter})
            .orderBy(`status."createdAt"`, "DESC")

        if (paginationRequest) {
            qb
                .offset(calculateOffset(paginationRequest.page, paginationRequest.pageSize))
                .limit(paginationRequest.pageSize)
        }

        return qb.getMany();
    }

    public async findByHashTagAndCreatedAtBetween(
        hashTag: HashTag,
        createdAtBefore: Date,
        createdAtAfter: Date,
        paginationRequest: PaginationRequest
    ): Promise<Status[]> {
        return this.createStatusQueryBuilder()
            .where(`"status_hashTag"."hashTagId" in (:...hashTags)`, {hashTags: [hashTag.id]})
            .where(`"status_filteredHashTag"."hashTagId" in (:...hashTags)`, {hashTags: [hashTag.id]})
            .orderBy(`status."createdAt"`, "DESC")
            .offset(calculateOffset(paginationRequest.page, paginationRequest.pageSize))
            .limit(paginationRequest.pageSize)
            .getMany();
    }

    public async findByHashTagOrderByNumberOfLikesForLastWeek(
        hashTag: HashTag,
        paginationRequest: PaginationRequest
    ): Promise<Status[]> {
        const ids = (await this.createQueryBuilder("status")
                .leftJoinAndSelect(
                    this.createLastWeekLikesCountSubquery(),
                    "status_like",
                    `status_like."statusId" = status.id`
                )
                .leftJoinAndSelect("status.hashTags", "hashTag")
                .select(["distinct(status.id)", "likes_count", "status.\"createdAt\""])
                .where(`"status_hashTag"."hashTagId" in (:...hashTags)`, {hashTags: [hashTag.id]})
                .orderBy({
                    "likes_count": {
                        order: "DESC",
                        nulls: "NULLS LAST"
                    },
                    "status.\"createdAt\"": "DESC"
                })
                .offset(calculateOffset(paginationRequest.page, paginationRequest.pageSize))
                .limit(paginationRequest.pageSize)
                .getRawMany()
        )
            .map(rawResult => rawResult.id as string);

        if (ids.length === 0) {
            return [];
        }
        return this.createStatusQueryBuilder()
            .where("status.id in (:...ids)", {ids})
            .orderBy({
                "status.\"favoritesCount\"": {
                    order: "DESC",
                    nulls: "NULLS LAST"
                },
                "status.\"createdAt\"": "DESC"
            })
            .getMany();
    }

    public async findByHashTagAndCreatedAtBetweenAndLikesForLastWeekBetweenOrderByNumberOfLikesForLastWeek(
        hashTag: HashTag,
        createdAtBefore: Date,
        createdAtAfter: Date,
        minLikes: number,
        maxLikes: number,
        paginationRequest: PaginationRequest
    ): Promise<Status[]> {
        const ids = (await this.createQueryBuilder("status")
                .leftJoinAndSelect(
                    this.createLastWeekLikesCountSubquery(),
                    "status_like",
                    `status_like."statusId" = status.id`
                )
                .leftJoinAndSelect("status.hashTags", "hashTag")
                .select(["distinct(status.id)", "likes_count", "status.\"createdAt\""])
                .where(`"status_filteredHashTag"."hashTagId" in (:...hashTags)`, {hashTags: [hashTag.id]})
                .andWhere(
                    `status."createdAt" between(:createdAtBefore, :createdAtAfter) and (likes_count between(:minLikes, :maxLikes) or likes_count is null)`,
                    {createdAtBefore, createdAtAfter, minLikes, maxLikes}
                    )
                .orderBy({
                    "status.\"favoritesCount\"": {
                        order: "DESC",
                        nulls: "NULLS LAST"
                    },
                    "status.\"createdAt\"": "DESC"
                })
                .offset(calculateOffset(paginationRequest.page, paginationRequest.pageSize))
                .limit(paginationRequest.pageSize)
                .getRawMany()
        )
            .map(rawResult => rawResult.id as string);

        if (ids.length === 0) {
            return [];
        }

        return this.createStatusQueryBuilder()
            .where("status.id in (:...ids)", {ids})
            .orderBy({
                "status.\"favoritesCount\"": "DESC",
                "status.\"createdAt\"": "DESC"
            })
            .getMany();
    }

    public async findByHashTagAndCreatedAtBeforeAndLikesForLastWeekLessThanOrderByNumberOfLikesForLastWeek(
        hashTag: HashTag,
        createdAtBefore: Date,
        maxLikes: number,
        paginationRequest: PaginationRequest
    ): Promise<Status[]> {
        const ids = (await this.createQueryBuilder("status")
                .leftJoinAndSelect(
                    this.createLastWeekLikesCountSubquery(),
                    "status_like",
                    `status_like."statusId" = status.id`
                )
                .leftJoinAndSelect("status.hashTags", "hashTag")
                .select(["distinct(status.id)", "likes_count", "status.\"createdAt\""])
                .where(`"status_hashTag"."hashTagId" in (:...hashTags)`, {hashTags: [hashTag.id]})
                .andWhere(`status."createdAt" < :createdAtBefore and (likes_count <= :maxLikes or likes_count is null)`, {createdAtBefore, maxLikes})
                .orderBy({
                    "likes_count": {
                        order: "DESC",
                        nulls: "NULLS LAST"
                    },
                    "status.\"createdAt\"": "DESC"
                })
                .offset(calculateOffset(paginationRequest.page, paginationRequest.pageSize))
                .limit(paginationRequest.pageSize)
                .getRawMany()
        )
            .map(rawResult => rawResult.id as string);

        if (ids.length === 0) {
            return [];
        }

        return this.createStatusQueryBuilder()
            .where("status.id in (:...ids)", {ids})
            .orderBy({
                "status.\"favoritesCount\"": {
                    order: "DESC",
                    nulls: "NULLS LAST"
                },
                "status.\"createdAt\"": "DESC"
            })
            .getMany();
    }

    public async findByHashTagAndCreatedAtAfterAndLikesForLastWeekMoreThanOrderByNumberOfLikesForLastWeek(
        hashTag: HashTag,
        createdAtAfter: Date,
        minLikes: number,
        paginationRequest: PaginationRequest
    ): Promise<Status[]> {
        const ids = (await this.createQueryBuilder("status")
                .leftJoinAndSelect(
                    this.createLastWeekLikesCountSubquery(),
                    "status_like",
                    `status_like."statusId" = status.id`
                )
                .leftJoinAndSelect("status.hashTags", "hashTag")
                .select(["distinct(status.id)", "likes_count", "status.\"createdAt\""])
                .where(`"status_hashTag"."hashTagId" in (:...hashTags)`, {hashTags: [hashTag.id]})
                .andWhere(`status."createdAt" < :createdAtAfter and (likes_count <= :minLikes or likes_count is null)`, {createdAtAfter, minLikes})
                .orderBy({
                    "likes_count": {
                        order: "DESC",
                        nulls: "NULLS LAST"
                    },
                    "status.\"createdAt\"": "DESC"
                })
                .offset(calculateOffset(paginationRequest.page, paginationRequest.pageSize))
                .limit(paginationRequest.pageSize)
                .getRawMany()
        )
            .map(rawResult => rawResult.id as string);

        if (ids.length === 0) {
            return [];
        }

        return this.createStatusQueryBuilder()
            .where("status.id in (:...ids)", {ids})
            .orderBy({
                "status.\"favoritesCount\"": {
                    order: "DESC",
                    nulls: "NULLS LAST"
                },
                "status.\"createdAt\"": "DESC"
            })
            .getMany();
    }

    public async findContainingHashTagsByLanguage(
        language: Language,
        paginationRequest: PaginationRequest
    ): Promise<Status[]> {
        const ids = (await this.createQueryBuilder("status")
                .leftJoinAndSelect("status.hashTags", "hashTag")
                .select(["distinct(status.id)", `status."createdAt"`])
                .where(`"status_hashTag"."hashTagId" is not null`)
                .andWhere(`"hashTag"."language" = :language`, {language})
                .orderBy(`"status"."createdAt"`, "DESC")
                .limit(paginationRequest.pageSize)
                .offset(calculateOffset(paginationRequest.page, paginationRequest.pageSize))
                .getRawMany()
        )
            .map(rawResult => rawResult.id as string);

        if (ids.length === 0) {
            return [];
        }

        return this.createStatusQueryBuilder()
            .where("status.id in (:...ids)", {ids})
            .andWhere(`"filteredHashTag"."name" != :hashTag`, {hashTag: MEMEZATOR_HASHTAG})
            .orderBy(`status."createdAt"`, "DESC")
            .getMany();
    }

    public async existsContainingHashTagsByLanguage(language: Language): Promise<boolean> {
        return (await this.createStatusQueryBuilder()
                .where(`"status_hashTag"."hashTagId" is not null`)
                .andWhere(`"hashTag"."language" = :language`, {language})
                .limit(1)
                .getCount()
        ) !== 0;
    }

    public async findContainingHashTagsByLanguageAndCreatedAtBefore(
        language: Language,
        createdAtBefore: Date,
        paginationRequest: PaginationRequest
    ): Promise<Status[]> {
        const ids = (await this.createQueryBuilder("status")
                .leftJoinAndSelect("status.hashTags", "hashTag")
                .select(["distinct(status.id)", `status."createdAt"`])
                .where(`"status_hashTag"."hashTagId" is not null`)
                .andWhere(`"hashTag"."language" = :language`, {language})
                .andWhere(`status."createdAt" < :createdAtBefore`, {createdAtBefore})
                .orderBy(`"status"."createdAt"`, "DESC")
                .limit(paginationRequest.pageSize)
                .offset(calculateOffset(paginationRequest.page, paginationRequest.pageSize))
                .getRawMany()
        )
            .map(rawResult => rawResult.id as string);

        if (ids.length === 0) {
            return [];
        }

        return this.createStatusQueryBuilder()
            .where("status.id in (:...ids)", {ids})
            .andWhere(`"filteredHashTag"."name" != :hashTag`, {hashTag: MEMEZATOR_HASHTAG})
            .orderBy(`status."createdAt"`, "DESC")
            .getMany();
    }

    public async findContainingHashTagsByLanguageAndCreatedAtAfter(
        language: Language,
        createdAtAfter: Date,
        paginationRequest: PaginationRequest
    ): Promise<Status[]> {
        const ids = (await this.createQueryBuilder("status")
                .leftJoinAndSelect("status.hashTags", "hashTag")
                .select(["distinct(status.id)", `status."createdAt"`])
                .where(`"status_hashTag"."hashTagId" is not null`)
                .andWhere(`"hashTag"."language" = :language`, {language})
                .andWhere(`status."createdAt" < :createdAtAfter`, {createdAtAfter})
                .orderBy(`"status"."createdAt"`, "DESC")
                .limit(paginationRequest.pageSize)
                .offset(calculateOffset(paginationRequest.page, paginationRequest.pageSize))
                .getRawMany()
        )
            .map(rawResult => rawResult.id as string);

        if (ids.length === 0) {
            return [];
        }

        return this.createStatusQueryBuilder()
            .where("status.id in (:...ids)", {ids})
            .andWhere(`"filteredHashTag"."name" != :hashTag`, {hashTag: MEMEZATOR_HASHTAG})
            .orderBy(`status."createdAt"`, "DESC")
            .getMany();
    }

    public async findContainingHashTagsByLanguageAndCreatedAtBetween(
        language: Language,
        createdAtBefore: Date,
        createdAtAfter: Date,
        paginationRequest: PaginationRequest
    ): Promise<Status[]> {
        const ids = (await this.createQueryBuilder("status")
                .leftJoinAndSelect("status.hashTags", "hashTag")
                .select(["distinct(status.id)", `status."createdAt"`])
                .where(`"status_hashTag"."hashTagId" is not null`)
                .andWhere(`"hashTag"."language" = :language`, {language})
                .andWhere(`status."createdAt" between(:createdAtBefore, :createdAtAfter)`, {createdAtBefore, createdAtAfter})
                .orderBy(`"status".createdAt"`, "DESC")
                .limit(paginationRequest.pageSize)
                .offset(calculateOffset(paginationRequest.page, paginationRequest.pageSize))
                .getRawMany()
        )
            .map(rawResult => rawResult.id as string);

        if (ids.length === 0) {
            return [];
        }

        return this.createStatusQueryBuilder()
            .where("status.id in (:...ids)", {ids})
            .andWhere(`"filteredHashTag"."name" != :hashTag`, {hashTag: MEMEZATOR_HASHTAG})
            .orderBy(`status."createdAt"`, "DESC")
            .getMany();
    }

    public async findContainingMemeHashTagsByLanguageAndCreatedAtBetween(
        language: Language,
        createdAtBefore: Date,
        createdAtAfter: Date,
        paginationRequest: PaginationRequest
    ): Promise<Status[]> {
        const ids = (await this.createQueryBuilder("status")
                .leftJoinAndSelect("status.hashTags", "hashTag")
                .select(["distinct(status.id)", `status."createdAt"`])
                .where(`"status_hashTag"."hashTagId" is not null`)
                .andWhere(`"hashTag"."name" = :hashTag`, {hashTag: MEMEZATOR_HASHTAG})
                .andWhere(`"hashTag"."language" = :language`, {language})
                .andWhere(`status."createdAt" between(:createdAtBefore, :createdAtAfter)`, {createdAtBefore, createdAtAfter})
                .orderBy(`"status".createdAt"`, "DESC")
                .limit(paginationRequest.pageSize)
                .offset(calculateOffset(paginationRequest.page, paginationRequest.pageSize))
                .getRawMany()
        )
            .map(rawResult => rawResult.id as string);

        if (ids.length === 0) {
            return [];
        }

        return this.createStatusQueryBuilder()
            .where("status.id in (:...ids)", {ids})
            .orderBy(`status."createdAt"`, "DESC")
            .getMany();
    }

    public async findContainingHashTagsByLanguageOrderByNumberOfLikesForLastWeek(
        language: Language,
        paginationRequest: PaginationRequest
    ): Promise<Status[]> {
        const ids = (await this.createQueryBuilder("status")
            .leftJoinAndSelect("status.hashTags", "hashTag")
            .leftJoinAndSelect(
                this.createLastWeekLikesCountSubquery(),
                "status_like",
                `status_like."statusId" = status.id`
            )
            .select(["distinct(status.id)", "likes_count", "status.\"createdAt\""])
            .where(`"status_hashTag"."hashTagId" is not null`)
            .andWhere(`"hashTag"."language" = :language`, {language})
            .orderBy({
                "likes_count": {
                    order: "DESC",
                    nulls: "NULLS LAST"
                },
                "status.\"createdAt\"": "DESC"
            })
            .offset(calculateOffset(paginationRequest.page, paginationRequest.pageSize))
            .limit(paginationRequest.pageSize)
            .getRawMany()
        )
            .map(rawResult => rawResult.id as string);

        if (ids.length === 0) {
            return [];
        }

        return this.createStatusQueryBuilder()
            .where("status.id in (:...ids)", {ids})
            .andWhere(`"filteredHashTag"."name" != :hashTag`, {hashTag: MEMEZATOR_HASHTAG})
            .orderBy({
                "status.\"favoritesCount\"": {
                    order: "DESC",
                    nulls: "NULLS LAST"
                },
                "status.\"createdAt\"": "DESC"
            })
            .getMany();
    }

    public async findContainingHashTagsByLanguageAndCreatedAtBeforeAndLikesForLastWeekLessThanOrderByNumberOfLikesForLastWeek(
        language: Language,
        createdAtBefore: Date,
        maxLikes: number,
        paginationRequest: PaginationRequest
    ): Promise<Status[]> {
        const ids = (await this.createQueryBuilder("status")
                .leftJoinAndSelect("status.hashTags", "hashTag")
                .leftJoinAndSelect(
                    this.createLastWeekLikesCountSubquery(),
                    "status_like",
                    `status_like."statusId" = status.id`
                )
                .select(["distinct(status.id)", "likes_count", "status.\"createdAt\""])
                .where(`"status_hashTag"."hashTagId" is not null`)
                .andWhere(`"hashTag"."language" = :language`, {language})
                .andWhere(`status."createdAt" < :createdAtBefore and (likes_count <= :maxLikes or likes_count is null)`, {createdAtBefore, maxLikes})
                .orderBy({
                    "likes_count": {
                        order: "DESC",
                        nulls: "NULLS LAST"
                    },
                    "status.\"createdAt\"": "DESC"
                })
                .offset(calculateOffset(paginationRequest.page, paginationRequest.pageSize))
                .limit(paginationRequest.pageSize)
                .getRawMany()
        )
            .map(rawResult => rawResult.id as string);

        if (ids.length === 0) {
            return [];
        }

        return this.createStatusQueryBuilder()
            .leftJoinAndSelect(
                this.createLastWeekLikesCountSubquery(),
                "status_like",
                `status_like."statusId" = status.id`
            )
            .where("status.id in (:...ids)", {ids})
            .andWhere(`"filteredHashTag"."name" != :hashTag`, {hashTag: MEMEZATOR_HASHTAG})
            .orderBy({
                "likes_count": {
                    order: "DESC",
                    nulls: "NULLS LAST"
                },
                "status.\"createdAt\"": "DESC"
            })
            .getMany();
    }

    public async findContainingMemeHashTagByLanguage(
        language: Language,
        paginationRequest: PaginationRequest
    ): Promise<Status[]> {
        return this.createStatusQueryBuilder()
            .where(`"hashTag"."name" = :hashTag`, {hashTag: MEMEZATOR_HASHTAG})
            .andWhere(`"hashTag"."language" = :language`, {language})
            .orderBy(`status."createdAt"`, "DESC")
            .offset(calculateOffset(paginationRequest.page, paginationRequest.pageSize))
            .limit(paginationRequest.pageSize)
            .getMany();
    }

    public async findContainingMemeHashTagByLanguageAndCreatedAtBefore(
        language: Language,
        createdAtBefore: Date,
        paginationRequest: PaginationRequest
    ): Promise<Status[]> {
        return this.createStatusQueryBuilder()
            .where(`"hashTag"."name" = :hashTag`, {hashTag: MEMEZATOR_HASHTAG})
            .andWhere(`"hashTag"."language" = :language`, {language})
            .andWhere(`status."createdAt" < :createdAtBefore`, {createdAtBefore})
            .orderBy(`status."createdAt"`, "DESC")
            .offset(calculateOffset(paginationRequest.page, paginationRequest.pageSize))
            .limit(paginationRequest.pageSize)
            .getMany();
    }

    public async findContainingMemeHashTagByLanguageAndCreatedAtAfter(
        language: Language,
        createdAtAfter: Date,
        paginationRequest: PaginationRequest
    ): Promise<Status[]> {
        return this.createStatusQueryBuilder()
            .where(`"hashTag"."name" = :hashTag`, {hashTag: MEMEZATOR_HASHTAG})
            .andWhere(`"hashTag"."language" = :language`, {language})
            .andWhere(`status."createdAt" > :createdAtAfter`, {createdAtAfter})
            .orderBy(`status."createdAt"`, "DESC")
            .offset(calculateOffset(paginationRequest.page, paginationRequest.pageSize))
            .limit(paginationRequest.pageSize)
            .getMany();
    }

    public async findContainingMemeHashTagByLanguageAndCreatedAtBetween(
        language: Language,
        createdAtBefore: Date,
        createdAtAfter: Date,
        paginationRequest: PaginationRequest
    ): Promise<Status[]> {
        return this.createStatusQueryBuilder()
            .where(`"hashTag"."name" = :hashTag`, {hashTag: MEMEZATOR_HASHTAG})
            .andWhere(`"hashTag"."language" = :language`, {language})
            .andWhere(`status."createdAt" between(:createdAtBefore, :createdAtAfter)`, {createdAtBefore, createdAtAfter})
            .orderBy(`status."createdAt"`, "DESC")
            .offset(calculateOffset(paginationRequest.page, paginationRequest.pageSize))
            .limit(paginationRequest.pageSize)
            .getMany();
    }

    public async findContainingMemeHashTagAndCreatedAtBetween(
        createdAtBefore: Date,
        createdAtAfter: Date,
    ): Promise<Status[]> {
        return this.createStatusQueryBuilder()
            .where(`"filteredHashTag"."name" = :hashTag`, {hashTag: MEMEZATOR_HASHTAG})
            .andWhere(`(status."createdAt" BETWEEN :createdAtBefore AND :createdAtAfter)`, {createdAtBefore, createdAtAfter})
            .orderBy(`status."createdAt"`, "DESC")
            .getMany();
    }

    public async findContainingHashTagsByLanguageAndCreatedAtAfterAndLikesForLastWeekMoreThanOrderByNumberOfLikesForLastWeek(
        language: Language,
        createdAtAfter: Date,
        minLikes: number,
        paginationRequest: PaginationRequest
    ): Promise<Status[]> {
        const ids = (await this.createQueryBuilder("status")
                .leftJoinAndSelect("status.hashTags", "hashTag")
                .leftJoinAndSelect(
                    this.createLastWeekLikesCountSubquery(),
                    "status_like",
                    `status_like."statusId" = status.id`
                )
                .select(["distinct(status.id)", "likes_count", "status.\"createdAt\""])
                .where(`"status_hashTag"."hashTagId" is not null`)
                .andWhere(`"hashTag"."language" = :language`, {language})
                .andWhere(`status."createdAt" < :createdAtBefore and (likes_count <= :maxLikes or likes_count is null)`, {createdAtAfter, minLikes})
                .orderBy({
                    "likes_count": {
                        order: "DESC",
                        nulls: "NULLS LAST"
                    },
                    "status.\"createdAt\"": "DESC"
                })
                .offset(calculateOffset(paginationRequest.page, paginationRequest.pageSize))
                .limit(paginationRequest.pageSize)
                .getRawMany()
        )
            .map(rawResult => rawResult.id as string);

        if (ids.length === 0) {
            return [];
        }

        return this.createStatusQueryBuilder()
            .leftJoinAndSelect(
                this.createLastWeekLikesCountSubquery(),
                "status_like",
                `status_like."statusId" = status.id`
            )
            .where("status.id in (:...ids)", {ids})
            .andWhere(`"filteredHashTag"."name" != :hashTag`, {hashTag: MEMEZATOR_HASHTAG})
            .orderBy({
                "last_week_likes_count": "DESC",
                "status.\"createdAt\"": "DESC"
            })
            .offset(calculateOffset(paginationRequest.page, paginationRequest.pageSize))
            .limit(paginationRequest.pageSize)
            .getMany();
    }

    public async findContainingHashTagsByLanguageAndCreatedAtBetweenOrderByNumberOfLikesForLastWeek(
        language: Language,
        createdAtBefore: Date,
        createdAtAfter: Date,
        paginationRequest: PaginationRequest
    ): Promise<Status[]> {
        const weekAgo = subDays(new Date(), 7);

        return this.createStatusQueryBuilder()
            .addSelect(
                subquery => subquery
                    .select("count(id)", "last_week_likes_count")
                    .from(StatusLike, "status_like")
                    .where(`status_like."statusId" = status.id`)
                    .andWhere("status_like.reverted = false")
                    .andWhere(`status_like."createdAt" > :weekAgo`, {weekAgo})
            )
            .where(`"status_hashTag"."hashTagId" is not null`)
            .andWhere(`"hashTag"."language" = :language`, {language})
            .andWhere(`"filteredHashTag"."name" != :hashTag`, {hashTag: MEMEZATOR_HASHTAG})
            .andWhere(`status."createdAt" between(:createdAtBefore, :createdAtAfter)`, {createdAtBefore, createdAtAfter})
            .orderBy({
                "last_week_likes_count": "DESC",
                "status.\"createdAt\"": "DESC"
            })
            .offset(calculateOffset(paginationRequest.page, paginationRequest.pageSize))
            .limit(paginationRequest.pageSize)
            .getMany();
    }

    private createLastWeekLikesCountSubquery(): (queryBuilder: SelectQueryBuilder<any>) => SelectQueryBuilder<any> {
        const weekAgo = subDays(new Date(), 7);

        return queryBuilder => queryBuilder
            .select(`count(id) as likes_count, "statusId"`)
            .from(StatusLike, "status_like")
            .andWhere(`"createdAt" > :weekAgo`, {weekAgo})
            .andWhere("reverted = false")
            .groupBy(`"statusId"`)
    }

    private createStatusQueryBuilder(): SelectQueryBuilder<Status> {
        return this.createQueryBuilder("status")
            .leftJoinAndSelect("status.hashTags", "filteredHashTag")
            .leftJoinAndSelect("status.hashTags", "hashTag")
            .leftJoinAndSelect("status.author", "author")
            .leftJoinAndSelect("author.avatar", "authorAvatar")
            .leftJoinAndSelect("status.mediaAttachments", "mediaAttachments")
            .leftJoinAndSelect("status.referredStatus", "referredStatus")
            .leftJoinAndSelect("referredStatus.mediaAttachments", "referredStatusMediaAttachments")
            .leftJoinAndSelect("referredStatus.author", "referredStatusAuthor")
            .leftJoinAndSelect("referredStatusAuthor.avatar", "referredStatusAuthorAvatar")
            .leftJoinAndSelect("referredStatus.hashTags", "referredStatusHashTags")
            .leftJoinAndSelect("referredStatus.referredStatus", "referredStatusReferredStatus");
    }

    public countByHashTag(hashTag: HashTag): Promise<number> {
        return this.createQueryBuilder("status")
            .leftJoinAndSelect("status.hashTags", "hashTag")
            .where(`"hashTagId" in (:...hashTags)`, {hashTags: [hashTag.id]})
            .getCount();
    }

    public countByCreatedAtAfter(createdAtAfter: Date): Promise<number> {
        return this.count({
            where: {
                createdAt: MoreThan(createdAtAfter)
            }
        });
    }

    public countByCreatedAtAfterAndStatusReferenceType(createdAtAfter: Date, statusReferenceType: StatusReferenceType): Promise<number> {
        return this.count({
            where: {
                createdAt: MoreThan(createdAtAfter),
                statusReferenceType
            }
        });
    }

    public countAll(): Promise<number> {
        return this.count();
    }
}
