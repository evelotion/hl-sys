import React from 'react';
import { db } from '../../../lib/db';
import UserClient from './UserClient';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const users = await db.user.findMany({ orderBy: { name: 'asc' } });
  return <UserClient initialUsers={users} />;
}