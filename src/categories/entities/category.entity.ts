import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'categoria_oficio' })
export class Category {
  @PrimaryGeneratedColumn({ name: 'id_categoria', type: 'bigint' })
  id!: string;

  @Index({ unique: true })
  @Column({ name: 'nombre', type: 'varchar', length: 80, unique: true })
  name!: string;

  @Column({ name: 'descripcion', type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'activa', type: 'boolean', default: true })
  isActive!: boolean;
}
