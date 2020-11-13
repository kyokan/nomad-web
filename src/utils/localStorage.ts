import {dotName, parseUsername, serializeUsername} from "nomad-universal/lib/utils/user";

let pk: string = '';

export const setPK = (privateKey: string) => {
  pk = privateKey;
};

export const clearPK = () => {
  pk = '';
};

export const getIdentity = () => {
  const token = localStorage.getItem('nomad_token');
  const username = localStorage.getItem('nomad_username');
  const { tld, subdomain } = parseUsername(username || '');

  return {
    tld: dotName(tld),
    subdomain,
    token,
  }
};

export const setIdentity = async (tld: string, subdomain: string, token: string): Promise<void> => {
  const username1 = serializeUsername(subdomain, tld);
  localStorage.setItem('nomad_token', token);
  localStorage.setItem('nomad_username', username1);
};

export const removeIdentity = async (): Promise<void> => {
  localStorage.removeItem('nomad_token');
  localStorage.removeItem('nomad_username');
};

export const isLoggedIn = (): boolean => {
  const { tld, subdomain, token } = getIdentity();
  const username = serializeUsername(subdomain, tld);

  return !!username && !!token && !!pk;
};

export const addSavedIdentity = async (tld: string, subdomain: string): Promise<string[]> => {
  const identities = getSavedIdentities();
  const identitySet = new Set(identities);
  identitySet.add(serializeUsername(subdomain, tld));
  const newIdentities = Array.from(identitySet);
  localStorage.setItem('nomad_saved_identities', newIdentities.join(','));
  return newIdentities;
};

export const getSavedIdentities = (): string[] => {
  const data = localStorage.getItem('nomad_saved_identities') || '';
  return data.split(',').filter(id => !!id);
};
