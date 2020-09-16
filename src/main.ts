import {config} from "dotenv";

config();

import {NestFactory} from "@nestjs/core";
import {ValidationPipe} from "@nestjs/common";
import bodyParser from "body-parser";
import {AppModule} from "./AppModule";
import {config as envConfig} from "./config";
import { setupSwagger } from "./setup-swagger";
import { runDbMigrations } from "./run-db-migrations";
import { NestExpressApplication } from "@nestjs/platform-express";

async function bootstrap() {
    if (envConfig.AUTO_RUN_DB_MIGRATIONS) {
        await runDbMigrations()
    }

    const app = await NestFactory.create<NestExpressApplication>(AppModule);
    app.use(bodyParser.json({limit: Infinity}));
    app.useGlobalPipes(new ValidationPipe({transform: true}));
    app.set("trust proxy", 1);
    app.enableCors();
    setupSwagger(app)
    await app.listen(envConfig.IGNITE_API_PORT);
}

bootstrap();
