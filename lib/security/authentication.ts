/**
 * Authentication and authorization security utilities
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createAppError, ErrorCodes } from '@/lib/utils/errorHandling'

export interface AuthResult {
  user: any
  error: Error | null
  authenticated: boolean
}

/**
 * Verify authentication for API routes
 */
export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader) {
      return {
        user: null,
        error: createAppError(
          new Error('Missing authorization header'),
          ErrorCodes.AUTH_REQUIRED
        ),
        authenticated: false,
      }
    }

    // Extract token (Bearer token or session token)
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : authHeader

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return {
        user: null,
        error: createAppError(
          error || new Error('Invalid token'),
          ErrorCodes.AUTH_INVALID
        ),
        authenticated: false,
      }
    }

    return {
      user,
      error: null,
      authenticated: true,
    }
  } catch (error) {
    return {
      user: null,
      error: createAppError(error, ErrorCodes.AUTH_REQUIRED),
      authenticated: false,
    }
  }
}

/**
 * Verify user role
 */
export async function verifyRole(
  userId: string,
  requiredRole: 'admin' | 'applicant'
): Promise<boolean> {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()

    if (error || !profile) {
      return false
    }

    return profile.role === requiredRole
  } catch {
    return false
  }
}

/**
 * Middleware wrapper for authenticated routes
 */
export function requireAuth(
  handler: (req: NextRequest, user: any) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const authResult = await verifyAuth(req)

    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return handler(req, authResult.user)
  }
}

/**
 * Middleware wrapper for admin-only routes
 */
export function requireAdmin(
  handler: (req: NextRequest, user: any) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const authResult = await verifyAuth(req)

    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const isAdmin = await verifyRole(authResult.user.id, 'admin')
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    return handler(req, authResult.user)
  }
}

/**
 * Verify user owns resource
 */
export async function verifyOwnership(
  userId: string,
  resourceUserId: string
): Promise<boolean> {
  return userId === resourceUserId
}

/**
 * Get user from request (client-side safe)
 */
export async function getCurrentUser(): Promise<any | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null
    return user
  } catch {
    return null
  }
}
