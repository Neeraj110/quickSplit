import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GithubProvider from "next-auth/providers/github";
import { User } from "@/models/User";
import connectDb from "@/lib/connectDb";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "you@example.com",
        },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        await connectDb();
        const user = await User.findOne({ email: credentials.email }).select(
          "+password"
        );
        if (!user || !user.password) {
          throw new Error("Invalid email or password");
        }

        const isValid = await user.comparePassword(credentials.password);
        if (!isValid) throw new Error("Invalid email or password");

        return {
          id: user?._id.toString(),
          email: user?.email,
          name: user?.name,
          image: user?.avatar ? user.avatar : "",
        };
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      await connectDb();
      if (!user?.email) return false;

      const existingUser = await User.findOne({ email: user.email });

      if (existingUser) {
        if (account?.provider !== "credentials") {
          let updated = false;
          if (user.name && user.name !== existingUser.name) {
            existingUser.name = user.name;
            updated = true;
          }
          if (user.image && user.image !== existingUser.avatar) {
            existingUser.avatar = user.image;
            updated = true;
          }
          if (updated) await existingUser.save();
        }
        return true;
      }

      if (account?.provider !== "credentials") {
        await User.create({
          email: user.email,
          name: user.name || "Unknown User",
          avatar: user.image || "",
        });
      }

      return true;
    },

    async jwt({ token, user, account }) {
      if (user) token.id = user.id;
      if (account) token.provider = account.provider;
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.provider = token.provider as string;
      }
      return session;
    },
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },

  pages: {
    signIn: "/signin",
    error: "/signin",
  },

  secret: process.env.NEXTAUTH_SECRET,
};
