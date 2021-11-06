const contributeds = (sequelize, DataTypes) => {
  const Contributeds = sequelize.define(
    "contributeds",
    {
      id: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
      },
      block_height: {
        type: DataTypes.INTEGER,
      },
      event_id: {
        type: DataTypes.INTEGER,
      },
      extrinsic_id: {
        type: DataTypes.INTEGER,
      },
      block_timestamp: {
        type: DataTypes.DATE,
      },
      account_id: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      para_id: {
        type: DataTypes.STRING,
      },
      balance_of: {
        type: DataTypes.STRING,
      },
    },
    {
      underscored: true,
      // 创建index
      indexes: [
        {
          unique: false,
          fields: ["para_id", "account_id"],
        },
        {
          unique: false,
          fields: ["para_id"],
        },
        {
          unique: false,
          fields: ["para_id", "block_timestamp"],
        },
        {
          unique: false,
          fields: ["para_id", "account_id", "block_timestamp"],
        },
      ],
    }
  );

  return Contributeds;
};

export default contributeds;
