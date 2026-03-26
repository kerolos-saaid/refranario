export type ApiRateLimitScope = 'ip' | 'ip-username' | 'auth-user-ip'

export type ApiRateLimitRule = {
  key: string
  scope: ApiRateLimitScope
  limit: number
  windowMs: number
}

export type ApiRateLimitPolicy = {
  key: string
  errorMessage: string
  rules: ApiRateLimitRule[]
}

export const apiRateLimitPolicies = {
  publicProverbsList: {
    key: 'public_proverbs_list',
    errorMessage: 'Too many proverb list requests. Please slow down and try again shortly.',
    rules: [
      { key: 'ip', scope: 'ip', limit: 120, windowMs: 60_000 }
    ]
  },
  publicProverbDetail: {
    key: 'public_proverb_detail',
    errorMessage: 'Too many proverb detail requests. Please slow down and try again shortly.',
    rules: [
      { key: 'ip', scope: 'ip', limit: 240, windowMs: 60_000 }
    ]
  },
  login: {
    key: 'login',
    errorMessage: 'Too many login attempts. Please wait a few minutes before trying again.',
    rules: [
      { key: 'ip', scope: 'ip', limit: 20, windowMs: 10 * 60_000 },
      { key: 'ip_username', scope: 'ip-username', limit: 5, windowMs: 10 * 60_000 }
    ]
  },
  adminProverbMutations: {
    key: 'admin_proverb_mutations',
    errorMessage: 'Too many proverb changes in a short time. Please wait a moment and try again.',
    rules: [
      { key: 'auth_user_ip', scope: 'auth-user-ip', limit: 60, windowMs: 10 * 60_000 }
    ]
  },
  adminUploads: {
    key: 'admin_uploads',
    errorMessage: 'Too many upload requests in a short time. Please wait a moment and try again.',
    rules: [
      { key: 'auth_user_ip', scope: 'auth-user-ip', limit: 20, windowMs: 10 * 60_000 }
    ]
  },
  adminUploadDeletes: {
    key: 'admin_upload_deletes',
    errorMessage: 'Too many image delete requests in a short time. Please wait a moment and try again.',
    rules: [
      { key: 'auth_user_ip', scope: 'auth-user-ip', limit: 60, windowMs: 10 * 60_000 }
    ]
  },
  imageJobStatus: {
    key: 'image_job_status',
    errorMessage: 'Too many image status refreshes. Please wait a moment and try again.',
    rules: [
      { key: 'auth_user_ip', scope: 'auth-user-ip', limit: 60, windowMs: 60_000 }
    ]
  },
  imageJobBackfill: {
    key: 'image_job_backfill',
    errorMessage: 'Image backfill was requested too often. Please wait a few minutes and try again.',
    rules: [
      { key: 'auth_user_ip', scope: 'auth-user-ip', limit: 3, windowMs: 10 * 60_000 }
    ]
  },
  imageJobRegenerate: {
    key: 'image_job_regenerate',
    errorMessage: 'Too many image regeneration requests. Please wait a moment and try again.',
    rules: [
      { key: 'auth_user_ip', scope: 'auth-user-ip', limit: 30, windowMs: 10 * 60_000 }
    ]
  }
} satisfies Record<string, ApiRateLimitPolicy>
