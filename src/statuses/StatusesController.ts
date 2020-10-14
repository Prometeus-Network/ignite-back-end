import {
    Body,
    ClassSerializerInterceptor,
    Controller,
    Get,
    Param,
    Post,
    Query,
    Req,
    UseGuards,
    UseInterceptors,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Request } from "express";
import { StatusesService } from "./StatusesService";
import { StatusLikesService } from "./StatusLikesService";
import {
    CreateStatusRequest,
    GetStatusesRequest,
    TopicFetchType,
} from "./types/request";
import { StatusResponse } from "./types/response";
import { OptionalJwtAuthGuard } from "../jwt-auth/OptionalJwtAuthGuard";
import { User } from "../users/entities";
import { TopicsService } from "./TopicsService";
import { FeedService } from "./FeedService";
import { ApiOkResponse, ApiCreatedResponse } from "@nestjs/swagger";
import { Recaptcha } from "@nestlab/google-recaptcha";
import { LoggerService } from "nest-logger";

@Controller("api/v1/statuses")
export class StatusesController {
    constructor(
        private readonly statusesService: StatusesService,
        private readonly topicsService: TopicsService,
        private readonly feedService: FeedService,
        private readonly statusLikesService: StatusLikesService,
        private readonly logger: LoggerService,
    ) {}

    @UseInterceptors(ClassSerializerInterceptor)
    @UseGuards(OptionalJwtAuthGuard)
    @ApiOkResponse({ type: () => StatusResponse })
    @Get()
    public getStatuses(
        @Req() request: Request,
        @Query() getStatusesRequest: GetStatusesRequest,
    ): Promise<StatusResponse[]> {
        if (
            getStatusesRequest.onlyWithHashTags ||
            getStatusesRequest.type === TopicFetchType.MEMES
        ) {
            return this.topicsService.getStatusesContainingHashTags(
                getStatusesRequest,
                request.user as User | null,
            );
        } else {
            return this.feedService.getGlobalFeed(
                getStatusesRequest,
                request.user as User | null,
                getStatusesRequest.language,
            );
        }
    }

    @UseInterceptors(ClassSerializerInterceptor)
    @UseGuards(AuthGuard("jwt"))
    @ApiCreatedResponse({ type: () => StatusResponse })
    @Recaptcha()
    @Post()
    public createStatus(
        @Body() createStatusRequest: CreateStatusRequest,
        @Req() request: Request,
    ): Promise<StatusResponse> {
        if (createStatusRequest.fromMemezator === true) {
            this.logger.log(
                `createStatus: Ip: ${request.ip}. Recaptcha token is: ${request.headers["x-recaptcha"]}`,
            );
        }
        return this.statusesService.createStatus(
            createStatusRequest,
            request.user as User,
        );
    }

    @UseInterceptors(ClassSerializerInterceptor)
    @ApiOkResponse({ type: () => StatusResponse })
    @UseGuards(OptionalJwtAuthGuard)
    @Get(":id")
    public findStatusById(
        @Param("id") id: string,
        @Req() request: Request,
    ): Promise<StatusResponse> {
        return this.statusesService.findStatusById(
            id,
            request.user as User | null,
        );
    }

    @UseInterceptors(ClassSerializerInterceptor)
    @UseGuards(AuthGuard("jwt"))
    @ApiCreatedResponse({ type: () => StatusResponse })
    @Post(":id/favourite")
    public likeStatus(
        @Param("id") id: string,
        @Req() request: Request,
    ): Promise<StatusResponse> {
        return this.statusLikesService.createStatusLike(
            id,
            request.user as User,
        );
    }

    @UseInterceptors(ClassSerializerInterceptor)
    @UseGuards(AuthGuard("jwt"))
    @ApiCreatedResponse({ type: () => StatusResponse })
    @Post(":id/unfavourite")
    public unlikeStatus(
        @Param("id") id: string,
        @Req() request: Request,
    ): Promise<StatusResponse> {
        return this.statusLikesService.deleteStatusLike(
            id,
            request.user as User,
        );
    }

    @UseInterceptors(ClassSerializerInterceptor)
    @UseGuards(OptionalJwtAuthGuard)
    @ApiOkResponse({ type: () => StatusResponse })
    @Get(":id/comments")
    public findCommentsOfStatus(
        @Param("id") id: string,
        @Req() request: Request,
        @Query("since_id") sinceId?: string,
        @Query("max_id") maxId?: string,
    ): Promise<StatusResponse[]> {
        return this.statusesService.findCommentsOfStatus(
            id,
            { sinceId, maxId },
            request.user as User | undefined,
        );
    }
}
