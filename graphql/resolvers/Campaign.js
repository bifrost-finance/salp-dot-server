import dotenv from "dotenv";
import { sequelize } from "../../server/models";
import { QueryTypes, Op } from "sequelize";
import { getStringQueryList } from "../utils/Common";
dotenv.config();

const MULTISIG_ACCOUNT = process.env.MULTISIG_ACCOUNT.split("|"); // 多签账户地址
const KSM_PRECISION = 1000000000000;

// GraphQL查询的resolver
const Campaign = {
  // ===========================================================================
  // ? QUERIES
  // ===========================================================================
  Query: {
    /// 查询某个campaign的活动信息
    getCampaignInfo: async (parent, { paraId, campaignIndex }, { models }) => {
      // 如果不传参数，则返回所有campaign列表
      let condition = {};

      // 如果只传campaignIndex，则返回特定campaign信息
      // 如果两个都传，则返回campaignIndex能查到的campaign信息
      if (campaignIndex) {
        condition = {
          where: {
            campaign_id: campaignIndex,
          },
          raw: true,
        };
        // 如果只传paraId，则返回所有与该paraId相关的campaign信息
      } else if (paraId) {
        condition = {
          where: {
            para_id: paraId,
          },
          raw: true,
        };
      }

      let result = await models.SalpCampaigns.findAll(condition);

      if (result != []) {
        result = result.map(
          ({ campaign_id, para_id, salp_start_time, salp_end_time }) => {
            return {
              campaignId: campaign_id,
              paraId: para_id,
              salpStartTime: salp_start_time,
              salpEndTime: salp_end_time,
            };
          }
        );
      }

      return {
        campaignInfo: result,
      };
    },

    /// 查询某个campaign的参与人数与累计金额
    getSalpCampaignStats: async (
      parent,
      { paraId, campaignIndex },
      { models }
    ) => {
      // 查询该campaign的起始时间，以便去查询参与人数
      let campaignCondition = {};
      if (campaignIndex) {
        campaignCondition = {
          where: {
            campaign_id: campaignIndex,
          },
          raw: true,
        };
      } else if (paraId) {
        campaignCondition = {
          where: {
            para_id: paraId,
          },
          raw: true,
        };
      }

      let campaign_periods = await models.SalpCampaigns.findAll(
        campaignCondition
      );

      let campaignStats = [];
      // 如果有要查的campaign时间
      if (campaign_periods != []) {
        campaignStats = campaign_periods.map(
          async ({ campaign_id, para_id, salp_start_time, salp_end_time }) => {
            console.log(campaign_id, para_id, salp_start_time, salp_end_time);

            let participantsCondition = {
              distinct: true,
              attributes: [
                "para_id",
                [
                  sequelize.literal(`COUNT(DISTINCT("from"))`),
                  "participants_count",
                ],
                [sequelize.literal("SUM(balance::bigint)"), "contribution_sum"],
              ],
              where: {
                para_id: para_id,
                [Op.and]: [
                  {
                    block_timestamp: {
                      [Op.gte]: new Date(salp_start_time * 1000),
                    },
                  },
                  {
                    block_timestamp: {
                      [Op.lte]: new Date(salp_end_time * 1000),
                    },
                  },
                ],
              },
              group: "para_id",
              raw: true,
            };

            let participantsResult = await models.TransferBatches.findAll(
              participantsCondition
            );

            console.log("participantsResult: ", participantsResult[0]);

            if (participantsResult != []) {
              let { participants_count, contribution_sum } =
                participantsResult[0];

              console.log("participants_count: ", participants_count);

              return {
                campaignId: campaign_id,
                paraId: para_id,
                participantsCount: participants_count,
                contributionSum: contribution_sum,
              };
            } else {
              return {
                campaignId: campaing_id,
                paraId: para_id,
                participantsCount: 0,
                contributionSum: "0",
              };
            }
          }
        );
      }

      return {
        campaignStats,
      };
    },

    /// 查询某个campaign的奖励信息
    getCampaignRewards: async (
      parent,
      { paraId, campaignIndex },
      { models }
    ) => {
      // 如果不传参数，则返回所有campaign列表
      let condition = {
        attributes: [
          "campaign_id",
          "para_id",
          "reward_coin_symbol",
          "reward_coefficient",
        ],
        order: [
          ["para_id", "ASC"],
          ["campaign_id", "ASC"],
        ],
        raw: true,
      };

      // 如果只传campaignIndex，则返回特定campaign信息
      // 如果两个都传，则返回campaignIndex能查到的campaign信息
      if (campaignIndex) {
        condition["where"] = { campaign_id: campaignIndex };
        // 如果只传paraId，则返回所有与该paraId相关的campaign信息
      } else if (paraId) {
        condition["where"] = { para_id: paraId };
      }

      let result = await models.Rewards.findAll(condition);

      if (result != []) {
        result = result.map(
          ({
            campaign_id,
            para_id,
            reward_coin_symbol,
            reward_coefficient,
          }) => {
            return {
              campaignId: campaign_id,
              paraId: para_id,
              rewardToken: reward_coin_symbol,
              rewardMultiplier: reward_coefficient,
            };
          }
        );
      }

      return {
        campaignRewards: result,
      };
    },

    /// 查询某个平行链最近一期的活动
    getParaLatestCampaign: async (parent, { paraId }, { models }) => {
      // 如果不传参数，则返回所有parachain的最新活动
      let queryString = "";
      // 如果传paraId了，则返回所有该paraId的最新活动
      if (paraId) {
        queryString = `AND "para_id" = '${paraId}'`;
      }

      let result = await sequelize.query(
        `SELECT campaign_id, para_id, salp_start_time, salp_end_time FROM (SELECT campaign_id, para_id, salp_start_time, salp_end_time, 
          Row_number() OVER (PARTITION BY "para_id" ORDER BY "salp_start_time" DESC) As RNum FROM "salp_campaigns") x WHERE RNum=1 ${queryString}; `,
        { type: QueryTypes.SELECT }
      );

      if (result != []) {
        result = result.map(
          ({ campaign_id, para_id, salp_start_time, salp_end_time }) => {
            return {
              campaignId: campaign_id,
              paraId: para_id,
              salpStartTime: salp_start_time,
              salpEndTime: salp_end_time,
            };
          }
        );
      }

      return {
        latestCampaigns: result,
      };
    },
    /// 获取每个campaign的时间累计序列，包含在bifrost平台和官方crowdloan的总数
    getAccumulatedContributionsSeries: async (
      parent,
      { paraId, campaignIndex },
      { models }
    ) => {
      // 查询该campaign的起始时间
      let campaignCondition = {};
      if (campaignIndex) {
        campaignCondition = {
          where: {
            campaign_id: campaignIndex,
          },
          raw: true,
        };
      } else if (paraId) {
        campaignCondition = {
          where: {
            para_id: paraId,
          },
          raw: true,
        };
      }

      let campaign_periods = await models.SalpCampaigns.findAll(
        campaignCondition
      );

      console.log("campaign_periods: ", campaign_periods);

      let campaignTimeSeries = [];
      // 如果有要查的campaign时间
      if (campaign_periods != []) {
        campaignTimeSeries = await Promise.all(
          campaign_periods.map(
            async ({
              campaign_id,
              para_id,
              salp_start_time,
              salp_end_time,
            }) => {
              const commonString = `WHERE "para_id" = '${para_id}' AND block_timestamp >= to_timestamp('${salp_start_time}') AND block_timestamp <= to_timestamp('${salp_end_time}') AND `;

              const queryString = `"account_id" NOT IN ${getStringQueryList(
                MULTISIG_ACCOUNT
              )}`;

              const queryString2 = `"to" IN ${getStringQueryList(
                MULTISIG_ACCOUNT
              )} AND "from" NOT IN ${getStringQueryList(MULTISIG_ACCOUNT)}`;

              const recordQueryString = `
          SELECT id, balance_of::bigint "amount", "block_timestamp" "time" FROM contributeds ${commonString} ${queryString} 
          UNION 
          SELECT id, balance::bigint "amount", "block_timestamp" "time" FROM transfer_batches ${commonString} ${queryString2}
          ORDER BY "time" DESC `;

              const dataString = `SELECT date_trunc('hour', time) as "time", amount::bigint 
          FROM (${recordQueryString}) union_table`;

              // 看活动结束了没有，没结束就画线到现在的时间。结束了就截止到活动结束的时间
              const seriesShouldEndTime =
                salp_end_time > Date.now() / 1000
                  ? Date.now() / 1000
                  : salp_end_time;

              const seriesString = `SELECT * FROM generate_series(to_timestamp('${salp_start_time}'), to_timestamp('${seriesShouldEndTime}'), '1 hours') as time`;

              const mainString = `SELECT time_table.time "time", SUM(data_table.amount::bigint) accumulated 
                              FROM (${seriesString}) as time_table 
                              LEFT JOIN (${dataString}) as data_table 
                              ON time_table.time = data_table.time
                              GROUP BY time_table.time
                              `;

              const cumulativeString = `SELECT time, SUM(accumulated) OVER
                                    (ORDER BY time ASC rows between unbounded preceding and current row) accumulated 
                                    FROM (${mainString}) as data`;

              const result = await sequelize.query(`${cumulativeString}`, {
                type: QueryTypes.SELECT,
              });

              return {
                campaignId: campaign_id,
                paraId: para_id,
                series: result,
              };
            }
          )
        );
      }

      return { campaignTimeSeries };
    },

    /// 查询某个campaign的奖励信息
    getBncRewardPoints: async (
      parent,
      { paraId, campaignIndex },
      { models }
    ) => {
      let condition = {
        attributes: [
          "campaign_id",
          "para_id",
          "reward_coin_symbol",
          "reward_coefficient",
          "early_bird_extra_reward_coefficient",
          "channel_reward_coefficient",
        ],
        order: [
          ["para_id", "ASC"],
          ["campaign_id", "ASC"],
        ],
        where: {
          campaign_id: campaignIndex,
          para_id: paraId,
        },
        raw: true,
      };

      let result = await models.Rewards.findOne(condition);

      if (result) {
        let {
          reward_coefficient,
          early_bird_extra_reward_coefficient,
          channel_reward_coefficient,
        } = result;

        // 再获取一个被邀请的奖励参数
        let condition2 = {
          attributes: ["campaign_id", "para_id", "invited_reward_coefficient"],
          order: [
            ["para_id", "ASC"],
            ["campaign_id", "ASC"],
          ],
          where: {
            campaign_id: campaignIndex,
            para_id: paraId,
          },
          raw: true,
        };

        let result2 = await models.InvitingRewards.findOne(condition2);
        let invited_reward_coefficient = result2
          ? result2.invited_reward_coefficient
          : 0;

        // 再获取一个campaign时间
        let campaign_condition = {
          where: {
            campaign_id: campaignIndex,
          },
          raw: true,
        };

        let campaign = await models.SalpCampaigns.findOne(campaign_condition);

        // Campaign肯定是存在的，因为已经有外面一层的判断了
        // 获取现在时间，如果现在时间小于early_bird结束时间，则返回 正常奖励+早鸟奖励。如果大于，则只返回正常奖励
        let now_time = Date.now() / 1000;
        let total_reward_points;
        if (now_time > campaign.early_bird_end_time) {
          total_reward_points =
            reward_coefficient +
            channel_reward_coefficient +
            invited_reward_coefficient;
        } else {
          total_reward_points =
            reward_coefficient +
            channel_reward_coefficient +
            invited_reward_coefficient +
            early_bird_extra_reward_coefficient;
        }

        return total_reward_points / 100;
      }
    },
  },
};

module.exports = Campaign;
