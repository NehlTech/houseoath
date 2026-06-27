import { Db } from 'mongodb';

export const ADMIN_SETTINGS_ID = 'admin';

export interface AdminSettingsDoc {
  _id: string;
  email: string;
  passwordHash: string;
  updatedAt: Date;
}

export async function getAdminSettings(db: Db): Promise<AdminSettingsDoc | null> {
  return db.collection<AdminSettingsDoc>('admin_settings').findOne({ _id: ADMIN_SETTINGS_ID });
}
