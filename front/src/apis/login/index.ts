import axios from 'axios';

const TARGET_VMEETING = process.env.REACT_APP_TARGET_VMEETING_DOMAIN;

const loginToVmeeting = async (username: string, password: string): Promise<string> => {
  const result = await axios(`https://${TARGET_VMEETING}/auth/api/login`, {
    method: 'POST',
    data: {
      username,
      password,
      remember: false,
    },
  });
  return result.data;
};

const loginToBaseAPI = async (username: string, token: string): Promise<string> => {
  const result = await axios(`https://${process.env.REACT_APP_API_SERVER_DOMAIN}/auth/login`, {
    method: 'POST',
    data: { username: username, vmeetingToken: token },
  });
  return result.data.token;
};

const login = async (username: string, password: string): Promise<{ vmJWT: string; wsJWT: string }> => {
  const vmJWT = await loginToVmeeting(username, password);
  const wsJWT = await loginToBaseAPI(username, vmJWT);

  return { vmJWT, wsJWT };
};

export default login;
