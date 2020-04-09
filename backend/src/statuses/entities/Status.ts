import {
    Column,
    Entity,
    JoinTable,
    ManyToMany,
    ManyToOne,
    PrimaryColumn,
    Tree,
    TreeParent,
    UpdateDateColumn
} from "typeorm";
import {User} from "../../users/entities/User";
import {MediaAttachment} from "../../media-attachments/entities";

@Entity()
@Tree("materialized-path")
export class Status {
    @PrimaryColumn()
    id: string;

    @Column({type: "varchar", length: 250})
    text: string;

    @ManyToOne(type => User, {eager: true})
    author: User;

    @Column()
    remote: boolean;

    @Column()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @ManyToMany(() => MediaAttachment, {eager: true})
    @JoinTable()
    mediaAttachments: MediaAttachment[];

    @Column({nullable: true})
    btfsHash?: string = undefined;

    @TreeParent()
    repostedStatus?: Status
}
