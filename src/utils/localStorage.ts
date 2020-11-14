import {dotName, parseUsername, serializeUsername} from "nomad-universal/lib/utils/user";
import SECP256k1Signer from "fn-client/lib/crypto/signer";

let pk: string = '';

export const setPK = (privateKey: string) => {
  pk = privateKey;
};

export const clearPK = () => {
  pk = '';
};

export const sign = (data: Buffer) => {
  const hex = Buffer.from(pk, 'base64').toString('hex');
  const signer = SECP256k1Signer.fromHexPrivateKey(hex);
  return signer.sign(data);
};

export const downloadPK = () => {
  const token = localStorage.getItem('nomad_token');
  const username = localStorage.getItem('nomad_username');
  const element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(token!));
  element.setAttribute('download', `${username}.keystore`);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
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
