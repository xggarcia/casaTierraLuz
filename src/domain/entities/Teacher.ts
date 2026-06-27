export interface Teacher {
  id: string
  userId: string | null
  organizationId: string
  slug: string
  name: string
  bio: string
  tags: string[]
  avatarUrl: string
  linkedinUrl: string
  socialUrl: string
  extraUrl: string
  portfolioImages: string[]
  portfolioVideos: string[]
  isPublic: boolean
  sortOrder: number
  createdAt: string
}

export interface TeacherImage {
  id: string
  name: string
  url: string
  tags: string[]
  organization_id: string
  created_at: string
}

export interface TeacherVideo {
  id: string
  name: string
  url: string
  tags: string[]
  organization_id: string
  created_at: string
}

export interface TeacherUserOption {
  id: string
  email: string
  displayName: string | null
}
