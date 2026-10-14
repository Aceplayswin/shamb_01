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
        kyc_status
        account_status
        currency
        wallet {
          main
          bonus
          exposure
          locked
          available
          currency
        }
      }
    }
  `);
  return data.me;
}
