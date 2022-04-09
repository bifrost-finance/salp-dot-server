const { gql } = require("apollo-server");

const Campaign = gql`
  type CampaignInfo {
    campaignInfo: [Campaign]
  }

  type Campaign {
    campaignId: String!
    paraId: String!
    salpStartTime: Int!
    salpEndTime: Int!
  }

  type CampaignStats {
    campaignStats: [CampaignStat]
  }

  type CampaignStat {
    campaignId: String
    paraId: String
    participantsCount: Int
    contributionSum: String
  }

  type CampaignRewards {
    campaignRewards: [CampaignReward]
  }

  type CampaignReward {
    campaignId: String
    paraId: String
    rewardToken: String
    rewardMultiplier: Float
  }

  type LatestCampaigns {
    latestCampaigns: [Campaign]
  }

  type CampaignTimeSeries {
    campaignTimeSeries: [CampaignTimeData]
  }

  type CampaignTimeData {
    campaignId: String
    paraId: String
    series: [AccumulatedData]
  }

  type AccumulatedData {
    time: String
    accumulated: String
  }

  type Query {
    getCampaignInfo(paraId: String, campaignIndex: String): CampaignInfo
    getSalpCampaignStats(paraId: String, campaignIndex: String): CampaignStats
    getCampaignRewards(paraId: String, campaignIndex: String): CampaignRewards
    getParaLatestCampaign(paraId: String): LatestCampaigns
    getAccumulatedContributionsSeries(
      paraId: String
      campaignIndex: String
    ): CampaignTimeSeries
    getBncRewardPoints(paraId: String!, campaignIndex: String!): Float
  }
`;

module.exports = Campaign;
