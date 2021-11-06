const transfer_batches = (sequelize, DataTypes) => {
  const TransferBatches = sequelize.define(
    "transfer_batches",
    {
      id: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
      },
      event_id: {
        type: DataTypes.INTEGER,
      },
      extrinsic_id: {
        type: DataTypes.INTEGER,
      },
      block_height: {
        type: DataTypes.INTEGER,
      },
      block_timestamp: {
        type: DataTypes.DATE,
      },
      from: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      to: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      balance: {
        type: DataTypes.STRING,
      },
      para_id: {
        type: DataTypes.STRING,
      },
      referrer: {
        type: DataTypes.STRING,
      },
    },
    {
      underscored: true,

      // 创建index
      indexes: [
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
          fields: ["para_id", "from"],
        },
        {
          unique: false,
          fields: ["block_timestamp"],
        },
        {
          unique: false,
          fields: ["para_id", "from", "block_timestamp"],
        },
        {
          unique: false,
          fields: ["referrer"],
        },
        {
          unique: false,
          fields: ["para_id", "referrer"],
        },
        {
          unique: false,
          fields: ["para_id", "referrer", "block_timestamp"],
        },
      ],
    }
  );

  return TransferBatches;
};

export default transfer_batches;
