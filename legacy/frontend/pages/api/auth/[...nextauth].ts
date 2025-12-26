import CredentialsProvider from 'next-auth/providers/credentials';
import FacebookProvider from 'next-auth/providers/facebook';
import NextAuth from 'next-auth';
import axios from 'axios';
import get from 'lodash/get';
import { request } from './../../../shared/services/strapi';
const options = {
  secret: process.env.SECRET,
  // Configure one or more authentication providers
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text', placeholder: 'test@test.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          const { data } = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/local`, {
            identifier: credentials.email,
            password: credentials.password,
          });

          if (data) {
            return data;
          } else {
            return null;
          }
        } catch (error) {
          console.log('ERROR', error);
          // const messages = get(error, ['response', 'data', 'message', 0, 'messages'], null);
          return null;
        }
      },
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    }),
  ],

  callbacks: {
    session: async ({ session, token }) => {
      session.jwt = token.accessToken;
      session.id = token.userId;
      return session;
    },
    jwt: async ({ token, user, account }) => {
      if (get(user, ['provider'], '') === 'facebook') {
        try {
          //TODO fix typing here
          const response = await request<any>(
            `/auth/${account.provider}/callback?access_token=${account?.access_token}`,
          );
          const { data } = response;
          token.accessToken = data.jwt;
          token.userId = data.user.id;
        } catch (error) {
          console.error('ERR', error);
        }
      }
      if (get(user, ['user', 'provider']) === 'local') {
        token.accessToken = user.jwt;
        token.userId = user.user.id;
        token.email = user.user.email;
        token.name = user.user.username;
        user = user.user;
      }

      return token;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
};
export default NextAuth(options);
