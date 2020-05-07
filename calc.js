export const CALC = {
  shows: [
    {
      calc(obj) {
        return obj.ctr ? +(((obj.clicks - (obj.not_value_clicks || 0)) / obj.ctr) * 100).toFixed(2) : 0;
      },
      calc_dependence: ['ctr', 'clicks'],
    },
  ],
  clicks: [
    {
      calc(obj) {
        return obj.ctr > 0 ? +((obj.shows * obj.ctr) / 100).toFixed(2) : 0;
      },
      calc_dependence: ['ctr', 'shows'],
    },
    {
      calc(obj) {
        return obj.cpc > 0 ? +(obj.sum / obj.cpc).toFixed(2) : 0;
      },
      calc_dependence: ['cpc', 'sum'],
    },
  ],
  sum: [
    {
      calc(obj) {
        return +(obj.clicks * obj.cpc).toFixed(2) || 0;
      },
      calc_dependence: ['cpc', 'clicks'],
    },
  ],
  ctr: [
    {
      calc(obj, components) {
        return obj.shows ? +(((obj.clicks - (obj.not_value_clicks || 0)) / obj.shows) * 100).toFixed(2) : 0;
      },
      calc_dependence: ['shows', 'clicks'],
    },
  ],
  cpc: [
    {
      calc(obj, components) {
        return obj.clicks ? +(obj.sum / obj.clicks).toFixed(2) : 0;
      },
      calc_dependence: ['clicks', 'sum'],
    },
  ],
};
