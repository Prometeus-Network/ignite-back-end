import {
    Column,
    Entity, Index,
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
import {StatusReferenceType} from "./StatusReferenceType";
import {HashTag} from "./HashTag";

@Entity()
@Tree("materialized-path")
export class Status {
    @PrimaryColumn()
    id: string;

    @Column({type: "varchar", length: 10000, nullable: true})
    text?: string;

    @ManyToOne(type => User, {eager: true})
    @Index()
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
    @Index()
    btfsHash?: string = undefined;

    @Column()
    favoritesCount: number;

    @Column()
    repostsCount: number;

    @TreeParent()
    @Index()
    referredStatus?: Status;

    @Column({nullable: true, type: "varchar", enum: StatusReferenceType})
    @Index()
    statusReferenceType?: StatusReferenceType;

    @Column({nullable: true})
    peerIp?: string;

    @Column({nullable: true})
    peerWallet?: string;

    @ManyToMany(() => HashTag, {eager: true})
    @JoinTable()
    hashTags: HashTag[];
}
