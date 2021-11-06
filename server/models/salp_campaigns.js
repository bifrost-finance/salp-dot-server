const salp_campaigns = (sequelize, DataTypes) => {
  const SalpCampaigns = sequelize.define(
    "salp_campaigns",
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
        validate: {
          notEmpty: true,
        },
      },
      // 投票开始时间
      salp_start_time: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          len: [10, 10],
        },
      },
      // 投票结束时间
      salp_end_time: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          len: [10, 10],
        },
      }
    },
    {
      underscored: true,
    }
  );

  return SalpCampaigns;
};

export default salp_campaigns;
