import Sequelize from "sequelize";
require("dotenv").config();

const Op = Sequelize.Op;

const sequelize = new Sequelize(process.env.POSTGRESQL_URI, {
  dialect: "postgres",
});

const models = {
  Contributeds: require("./contributeds").default(sequelize, Sequelize),
  Rewards: require("./rewards").default(sequelize, Sequelize),
  SalpCampaigns: require("./salp_campaigns").default(sequelize, Sequelize),
  TransferBatches: require("./transfer_batches").default(sequelize, Sequelize),
  InvitingRewards: require("./inviting_rewards").default(sequelize, Sequelize),
};

Object.keys(models).forEach((key) => {
  if ("associate" in models[key]) {
    models[key].associate(models);
  }
});

export { sequelize };
export default models;
