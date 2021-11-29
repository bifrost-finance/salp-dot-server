const inviting_rewards = (sequelize, DataTypes) => {
  const InvitingRewards = sequelize.define(
    "inviting_rewards",
    {
      // 一个para_id可能有多场募集，所以用不同的id来标识
      campaign_id: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
      },
      para_id: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
      },
      reward_coin_symbol: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
      },
      reward_coefficient: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        primaryKey: true,
      },
    },
    {
      underscored: true,
    }
  );

  return InvitingRewards;
};

export default inviting_rewards;
