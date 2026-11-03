import { z } from 'zod';

export const updateProfileSchema = z.object({
  igUsername: z.string().max(100).optional().nullable(),
  igBio: z.string().max(500).optional().nullable(),
  igFollowers: z.string().max(20).optional().nullable(),
  igFollowing: z.string().max(20).optional().nullable(),
  igPostsCount: z.string().max(20).optional().nullable(),
  igProfilePic: z.string().max(500).optional().nullable(),
});

export type UpdateProfileBody = z.infer<typeof updateProfileSchema>;
