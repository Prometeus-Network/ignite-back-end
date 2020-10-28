import {MigrationInterface, QueryRunner, TableColumn} from "typeorm";

export class statusesRepostsCount1599040152931 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.addColumn('status', new TableColumn({type: 'int', name: 'repostsCount', default: 0}));
        await queryRunner.query(`
        UPDATE status
	    SET "repostsCount" = reposts_count_per_status.reposts_count
	        FROM (
                SELECT count(id) AS reposts_count, status."referredStatusId" AS status_id
                FROM status 
                WHERE "referredStatusId" IS NOT NULL AND "statusReferenceType" = 'REPOST'
                GROUP BY status_id
                ) 
        AS reposts_count_per_status
	    WHERE status.id = reposts_count_per_status.status_id;
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.dropColumn('status', 'repostsCount');
    }

}
