import BigNumber from "bignumber.js";
import { Op } from "sequelize";
import { sequelize } from "../../server/models";
import { getSumOfAFieldFromList } from "../utils/Common";

// GraphQL查询的resolver
const Contributions = {
  // ===========================================================================
  // ? QUERIES
  // ===========================================================================
  Query: {
    /// 获取个人SALP总贡献金额及衍生品和奖励情况
    getSalpContributionsNRewards: async (
      parent,
      { account, campaignIndex },
      { models }
    ) => {
      let campaign_condition = {};
      if (campaignIndex) {
        // 先查出来campaign的时间段，然后再查询时间段内的贡献交易
        campaign_condition = {
          where: {
            campaign_id: campaignIndex,
          },
          raw: true,
        };
      }
      let campaigns = await models.SalpCampaigns.findAll(campaign_condition);

      let accountCampContributions = [];
      let vsdot_amount = new BigNumber(0); // vsdot数量
      let rewards_amount_total = {}; // 奖励json格式
      let rewards_amount_list = []; // 奖励数组格式
      if (campaigns != []) {
        accountCampContributions = await Promise.all(
          campaigns.map(
            async ({
              campaign_id,
              para_id,
              salp_start_time,
              salp_end_time,
            }) => {
              let condition = {
                attributes: [
                  [sequelize.literal(`SUM(balance::bigint)`), "total_amount"],
                ],
                where: {
                  from: account,
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
                raw: true,
              };
              let result = await models.TransferBatches.findAll(condition);

              if (result[0]["total_amount"]) {
                return {
                  campaign_id,
                  para_id,
                  total_amount: new BigNumber(result[0]["total_amount"]),
                };
              } else {
                return { campaign_id, para_id, total_amount: new BigNumber(0) };
              }
            }
          )
        );

        // 把个人没有贡献的campaign过滤掉
        let accountCampContributionsFiltered = [];
        for (const campCon of accountCampContributions) {
          if (campCon["total_amount"].isGreaterThan(0)) {
            accountCampContributionsFiltered.push(campCon);
          }
        }

        // 返回之前，以及计算vsDot和奖励金额
        for (const {
          campaign_id,
          para_id,
          total_amount,
        } of accountCampContributionsFiltered) {
          // vsdot金额等于投票金额
          vsdot_amount = vsdot_amount.plus(total_amount);
          // 获取奖励币种及比率
          const reward_condition = {
            where: { campaign_id: campaign_id },
            raw: true,
          };
          const reward_list = await models.Rewards.findAll(reward_condition);

          for (const {
            reward_coin_symbol,
            reward_coefficient,
          } of reward_list) {
            const token_reward_amount = total_amount.multipliedBy(
              reward_coefficient
            );

            if (!rewards_amount_total[reward_coin_symbol]) {
              rewards_amount_total[reward_coin_symbol] = token_reward_amount;
            } else {
              rewards_amount_total[reward_coin_symbol] = rewards_amount_total[
                reward_coin_symbol
              ].plus(token_reward_amount);
            }
          }
        }
      }
      // 把json变成数组
      if (rewards_amount_total != {}) {
        rewards_amount_list = Object.keys(rewards_amount_total).map(
          (token_symbol) => {
            return {
              tokenName: token_symbol,
              rewardAmount: rewards_amount_total[token_symbol].toFixed(0),
            };
          }
        );
      }
      return {
        contributions: vsdot_amount.toFixed(0),
        totalVsdot: vsdot_amount.toFixed(0),
        totalRewardList: rewards_amount_list,
      };
    },
    /// 获取个人SALP贡献明细
    getSalpContributionDetails: async (
      parent,
      { account, campaignIndex },
      { models }
    ) => {
      // 如果不传参数，则返回所有campaign列表
      let condition = {
        attributes: ["block_timestamp", "para_id", "balance"],
        order: [["block_timestamp", "DESC"]],
        raw: true,
      };
      // 如果传了account，刚查询该account的信息，如果没传，则查询所有的信息，这时候会用到limit
      if (campaignIndex) {
        // 先查出来campaign的时间段，然后再查询时间段内的贡献交易
        let campaign_condition = {
          where: {
            campaign_id: campaignIndex,
          },
          raw: true,
        };

        let campaign_result = await models.SalpCampaigns.findAll(
          campaign_condition
        );

        if (campaign_result != []) {
          condition["where"] = {
            from: account,
            para_id: campaign_result[0].para_id,
            [Op.and]: [
              {
                block_timestamp: {
                  [Op.gte]: new Date(campaign_result[0].salp_start_time * 1000),
                },
              },
              {
                block_timestamp: {
                  [Op.lte]: new Date(campaign_result[0].salp_end_time * 1000),
                },
              },
            ],
          };
        }
      } else {
        condition["where"] = { from: account };
      }
      let result = await models.TransferBatches.findAll(condition);

      result = result.map(({ block_timestamp, para_id, balance }) => {
        return {
          timestamp: block_timestamp,
          paraId: para_id,
          balance,
        };
      });

      return { salpContributionDetails: result };
    },
    /// 获取个人官方总crowdloan贡献金额及奖励情况
    getOfficialContributionsNRewards: async (
      parent,
      { account, campaignIndex },
      { models }
    ) => {
      let campaign_condition = {};
      if (campaignIndex) {
        // 先查出来campaign的时间段，然后再查询时间段内的贡献交易
        campaign_condition = {
          where: {
            campaign_id: campaignIndex,
          },
          raw: true,
        };
      }
      let campaigns = await models.SalpCampaigns.findAll(campaign_condition);
      let accountCampContributions = [];
      let rewards_amount_total = {}; // 奖励json格式
      let rewards_amount_list = []; // 奖励数组格式
      let contributions_amount = new BigNumber(0);
      if (campaigns != []) {
        accountCampContributions = await Promise.all(
          campaigns.map(
            async ({
              campaign_id,
              para_id,
              salp_start_time,
              salp_end_time,
            }) => {
              let condition = {
                attributes: [
                  [
                    sequelize.literal(`SUM(balance_of::bigint)`),
                    "total_amount",
                  ],
                ],
                where: {
                  account_id: account,
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
                raw: true,
              };
              let result = await models.Contributeds.findAll(condition);

              if (result[0]["total_amount"]) {
                return {
                  campaign_id,
                  para_id,
                  total_amount: new BigNumber(result[0]["total_amount"]),
                };
              } else {
                return { campaign_id, para_id, total_amount: new BigNumber(0) };
              }
            }
          )
        );

        // 把个人没有贡献的campaign过滤掉
        let accountCampContributionsFiltered = [];
        for (const campCon of accountCampContributions) {
          if (campCon["total_amount"].isGreaterThan(0)) {
            accountCampContributionsFiltered.push(campCon);
          }
        }

        // 返回之前，以及计算vsDot和奖励金额
        for (const {
          campaign_id,
          para_id,
          total_amount,
        } of accountCampContributionsFiltered) {
          // vsdot金额等于投票金额
          contributions_amount = contributions_amount.plus(total_amount);
          // 获取奖励币种及比率
          const reward_condition = {
            where: { campaign_id: campaign_id },
            raw: true,
          };
          const reward_list = await models.Rewards.findAll(reward_condition);

          for (const {
            reward_coin_symbol,
            reward_coefficient,
          } of reward_list) {
            const token_reward_amount = total_amount.multipliedBy(
              reward_coefficient
            );

            if (!rewards_amount_total[reward_coin_symbol]) {
              rewards_amount_total[reward_coin_symbol] = token_reward_amount;
            } else {
              rewards_amount_total[reward_coin_symbol] = rewards_amount_total[
                reward_coin_symbol
              ].plus(token_reward_amount);
            }
          }
        }
      }
      // 把json变成数组
      if (rewards_amount_total != {}) {
        rewards_amount_list = Object.keys(rewards_amount_total).map(
          (token_symbol) => {
            return {
              tokenName: token_symbol,
              rewardAmount: rewards_amount_total[token_symbol].toFixed(0),
            };
          }
        );
      }
      return {
        contributions: contributions_amount.toFixed(0),
        totalRewardList: rewards_amount_list,
      };
    },
    /// 获取个人官方crowdloan明细贡献金额
    getOfficialContributionDetails: async (
      parent,
      { account, campaignIndex },
      { models }
    ) => {
      // 如果不传参数，则返回所有campaign列表
      let condition = {
        attributes: ["block_timestamp", "para_id", "balance"],
        order: [["block_timestamp", "DESC"]],
        raw: true,
      };
      // 如果传了account，刚查询该account的信息，如果没传，则查询所有的信息，这时候会用到limit
      if (campaignIndex) {
        // 先查出来campaign的时间段，然后再查询时间段内的贡献交易
        let campaign_condition = {
          where: {
            campaign_id: campaignIndex,
          },
          raw: true,
        };

        let campaign_result = await models.SalpCampaigns.findAll(
          campaign_condition
        );

        if (campaign_result != []) {
          condition["where"] = {
            account_id: account,
            para_id: campaign_result[0].para_id,
            [Op.and]: [
              {
                block_timestamp: {
                  [Op.gte]: new Date(campaign_result[0].salp_start_time * 1000),
                },
              },
              {
                block_timestamp: {
                  [Op.lte]: new Date(campaign_result[0].salp_end_time * 1000),
                },
              },
            ],
          };
        }
      } else {
        condition["where"] = { account_id: account };
      }
      let result = await models.Contributeds.findAll(condition);

      result = result.map(({ block_timestamp, para_id, balance_of }) => {
        return {
          timestamp: block_timestamp,
          paraId: para_id,
          balance: balance_of,
        };
      });

      return { officialContributionDetails: result };
    },
    /// 查看个人邀请情况
    getSalpInvitingContributions: async (
      parent,
      { account, campaignIndex },
      { models }
    ) => {
      // 如果不传参数，则返回所有campaign列表
      let condition = {
        attributes: ["from", "block_timestamp", "para_id", "balance"],
        order: [["block_timestamp", "DESC"]],
        raw: true,
      };
      // 如果传了account，刚查询该account的信息，如果没传，则查询所有的信息，这时候会用到limit
      if (campaignIndex) {
        // 先查出来campaign的时间段，然后再查询时间段内的贡献交易
        let campaign_condition = {
          where: {
            campaign_id: campaignIndex,
          },
          raw: true,
        };

        let campaign_result = await models.SalpCampaigns.findAll(
          campaign_condition
        );

        if (campaign_result != []) {
          condition["where"] = {
            referrer: account,
            para_id: campaign_result[0].para_id,
            [Op.and]: [
              {
                block_timestamp: {
                  [Op.gte]: new Date(campaign_result[0].salp_start_time * 1000),
                },
              },
              {
                block_timestamp: {
                  [Op.lte]: new Date(campaign_result[0].salp_end_time * 1000),
                },
              },
            ],
          };
        }
      } else {
        condition["where"] = { referrer: account };
      }
      let result = await models.TransferBatches.findAll(condition);

      let inviting_list = result.map(
        ({ from, block_timestamp, para_id, balance }) => {
          return {
            invitee: from,
            timestamp: block_timestamp,
            paraId: para_id,
            balance,
          };
        }
      );

      let inviting_amount = getSumOfAFieldFromList(result, "balance");

      return {
        invitingList: inviting_list,
        invitingTotal: inviting_amount.toFixed(0),
      };
    },
    /// 查看个人Salp按campaign分组所获得的分开的贡献
    getSalpPerCampaignContributions: async (
      parent,
      { account, campaignIndex },
      { models }
    ) => {
      let accountCampContributions = [];
      let accountCampContributionsFiltered = [];

      let campaign_condition = {};
      // 如果传了account，刚查询该account的信息，如果没传，则查询所有的信息，这时候会用到limit
      if (campaignIndex) {
        // 先查出来campaign的时间段，然后再查询时间段内的贡献交易
        campaign_condition = {
          where: {
            campaign_id: campaignIndex,
          },
          raw: true,
        };
      }

      let campaigns = await models.SalpCampaigns.findAll(campaign_condition);

      if (campaigns != []) {
        accountCampContributions = await Promise.all(
          campaigns.map(
            async ({
              campaign_id,
              para_id,
              salp_start_time,
              salp_end_time,
            }) => {
              let condition = {
                attributes: [
                  [sequelize.literal(`SUM(balance::bigint)`), "total_amount"],
                  [sequelize.literal(`COUNT(balance)`), "total_count"],
                ],
                where: {
                  from: account,
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
                raw: true,
              };
              let result = await models.TransferBatches.findAll(condition);

              if (result[0]["total_amount"]) {
                return {
                  campaign_id,
                  para_id,
                  total_amount: new BigNumber(result[0]["total_amount"]),
                  total_count: result[0]["total_count"],
                };
              } else {
                return {
                  campaign_id,
                  para_id,
                  total_amount: new BigNumber(0),
                  total_count: result[0]["total_count"],
                };
              }
            }
          )
        );

        // 把个人没有贡献的campaign过滤掉
        for (const {
          campaign_id,
          para_id,
          total_amount,
          total_count,
        } of accountCampContributions) {
          if (total_amount.isGreaterThan(0)) {
            accountCampContributionsFiltered.push({
              campaignId: campaign_id,
              paraId: para_id,
              totalAmount: total_amount.toFixed(0),
              totalCount: total_count,
            });
          }
        }
      }

      return {
        accountCampContributions: accountCampContributionsFiltered,
      };
    },
    /// 查看个人官方crowdloan按campaign分组所获得的分开的贡献
    getOfficialPerCampaignContributions: async (
      parent,
      { account, campaignIndex },
      { models }
    ) => {
      let accountCampContributions = [];
      let accountCampContributionsFiltered = [];

      let campaign_condition = {};
      // 如果传了account，刚查询该account的信息，如果没传，则查询所有的信息，这时候会用到limit
      if (campaignIndex) {
        // 先查出来campaign的时间段，然后再查询时间段内的贡献交易
        campaign_condition = {
          where: {
            campaign_id: campaignIndex,
          },
          raw: true,
        };
      }

      let campaigns = await models.SalpCampaigns.findAll(campaign_condition);

      if (campaigns != []) {
        accountCampContributions = await Promise.all(
          campaigns.map(
            async ({
              campaign_id,
              para_id,
              salp_start_time,
              salp_end_time,
            }) => {
              let condition = {
                attributes: [
                  [
                    sequelize.literal(`SUM(balance_of::bigint)`),
                    "total_amount",
                  ],
                  [sequelize.literal(`COUNT(balance_of)`), "total_count"],
                ],
                where: {
                  account_id: account,
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
                raw: true,
              };
              let result = await models.Contributeds.findAll(condition);

              if (result[0]["total_amount"]) {
                return {
                  campaign_id,
                  para_id,
                  total_amount: new BigNumber(result[0]["total_amount"]),
                  total_count: result[0]["total_count"],
                };
              } else {
                return {
                  campaign_id,
                  para_id,
                  total_amount: new BigNumber(0),
                  total_count: result[0]["total_count"],
                };
              }
            }
          )
        );

        // 把个人没有贡献的campaign过滤掉
        for (const {
          campaign_id,
          para_id,
          total_amount,
          total_count,
        } of accountCampContributions) {
          if (total_amount.isGreaterThan(0)) {
            accountCampContributionsFiltered.push({
              campaignId: campaign_id,
              paraId: para_id,
              totalAmount: total_amount.toFixed(0),
              totalCount: total_count,
            });
          }
        }
      }

      return {
        accountCampContributions: accountCampContributionsFiltered,
      };
    },
  },
};

module.exports = Contributions;
