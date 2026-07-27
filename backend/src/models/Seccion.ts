import { Model, DataTypes, Sequelize } from 'sequelize';
import { GradoAno } from './GradoAno';

export class Seccion extends Model {
  declare id_seccion: number;
  declare id_grado: number;
  declare letra: string;
  declare id_docente_guia: number;
  declare id_aula: number | null;
  declare capacidad_maxima: number | null;
  declare readonly created_at: Date;
  declare readonly updated_at: Date | null;

  declare id_periodo: number;
  declare grado?: GradoAno;

  static associate(models: any) {
    Seccion.belongsTo(models.PeriodoEscolar, { foreignKey: 'id_periodo', as: 'periodo' });
    Seccion.belongsTo(models.GradoAno, { foreignKey: 'id_grado', as: 'grado' });
    Seccion.belongsTo(models.Usuario, { foreignKey: 'id_docente_guia', as: 'docenteGuia' });
    Seccion.belongsTo(models.Aula, { foreignKey: 'id_aula', as: 'aula' });
    Seccion.hasMany(models.Matricula, { foreignKey: 'id_seccion', as: 'matriculas' });
    Seccion.hasMany(models.HorarioDocente, { foreignKey: 'id_seccion', as: 'horarios' });
  }
}

export function initSeccion(sequelize: Sequelize): typeof Seccion {
  Seccion.init(
    {
      id_seccion: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      id_periodo: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'periodos_escolares',
          key: 'id_periodo',
        },
      },
      id_grado: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'grados_anos',
          key: 'id_grado',
        },
      },
      letra: {
        type: DataTypes.CHAR(1),
        allowNull: false,
      },
      id_docente_guia: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'usuarios',
          key: 'id_usuario',
        },
      },
      id_aula: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'aulas',
          key: 'id_aula',
        },
      },
      capacidad_maxima: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 30,
      },
    },
    {
      sequelize,
      tableName: 'secciones',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );
  return Seccion;
}
