// Filter definitions shared by the report screens. Kept out of the pages so the
// sport and market lists cannot drift between the reports that offer them.

export const SPORT_OPTIONS = [
  { value: 'cricket', label: 'Cricket' },
  { value: 'soccer', label: 'Soccer' },
  { value: 'tennis', label: 'Tennis' },
  { value: 'horse_racing', label: 'Horse Racing' },
  { value: 'greyhound', label: 'Greyhound' },
];

// Values match core/agent_models.py SportMarket.MarketType.
export const MARKET_TYPE_OPTIONS = [
  { value: 'match_odds', label: 'Match Odds' },
  { value: 'bookmaker', label: 'Bookmaker' },
  { value: 'fancy', label: 'Fancy' },
  { value: 'toss', label: 'Toss' },
  { value: 'tied_match', label: 'Tied Match' },
  { value: 'other', label: 'Other' },
];

export const SPORT_FIELD = {
  name: 'sport',
  label: 'Sport Type',
  type: 'select',
  options: SPORT_OPTIONS,
};

export const MARKET_TYPE_FIELD = {
  name: 'marketType',
  label: 'Market Type',
  type: 'select',
  options: MARKET_TYPE_OPTIONS,
};

export const EVENT_FIELD = { name: 'event', label: 'Event' };
export const AGENT_FIELD = { name: 'agentName', label: 'Agent Name' };
export const PLAYER_FIELD = { name: 'player', label: 'Player' };
