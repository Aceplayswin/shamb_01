import { API_URL } from './tenant';

export async function graphql(query, variables = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(`${API_URL}/graphql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data;
}

export async function fetchMe() {
  const data = await graphql(`
    query Me {
      me {
        id
        username
        full_name
        phone
        account_status
        currency
        website_language
        country_code
        state
        gender
        referral_code
        phone_verified
        two_factor_enabled
        vip_level
        is_demo
        created_at
        last_login_at
        wallet {
          main
          bonus
          exposure
          locked
          available
          withdrawable
          playable
          total
          currency
        }
      }
    }
  `);
  return data.me;
}
