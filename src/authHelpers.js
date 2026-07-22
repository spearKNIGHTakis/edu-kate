// ─────────────────────────────────────────────────────────────
// authHelpers.js
// Handles reconciling the Supabase auth user with the `profiles`
// row (and, for teachers, the `teachers` row) after login/signup.
//
// IMPORTANT: field lists below are kept in exact sync with the
// SQL schema shown in the app's Settings tab:
//
//   profiles(user_id, email, name, role, subject, class, phone, created_at)
//   teachers(id, name, email, subject, class, phone, qualification,
//            experience_years, status, created_at)
//
// Never add a key to the payload sent to either table that isn't
// in these lists — PostgREST returns 404/400 for unknown columns,
// which is what caused the original bug in BLANK_STU/students.
// ─────────────────────────────────────────────────────────────

/**
 * Decide what "profile" to use right after login, before we've
 * necessarily synced anything to the database.
 *
 * @param {object} params
 * @param {object} params.authUser      - supabase.auth user object
 * @param {string} params.selectedRole  - role picked on the login screen
 * @param {object|null} params.profile  - existing row from profiles, or null
 * @param {object|null} params.profileError - error from the profiles select
 * @returns {{ profile: object, shouldCreateProfile: boolean }}
 */
export function resolveLoginProfile({ authUser, selectedRole, profile, profileError }) {
  // A real query failure (not just "no rows") — surface a sane
  // fallback profile but don't claim it needs creating; syncProfileAndTeacher
  // will retry the read/write and report its own error.
  if (profileError && profile == null) {
    return {
      profile: {
        user_id: authUser.id,
        email: authUser.email,
        name: authUser.user_metadata?.name || authUser.email,
        role: selectedRole,
        subject: '',
        class: '',
        phone: '',
      },
      shouldCreateProfile: false,
    };
  }

  // No profile row exists yet for this user — first login after signup,
  // or a profile that never got created. Build a default one.
  if (!profile) {
    return {
      profile: {
        user_id: authUser.id,
        email: authUser.email,
        name: authUser.user_metadata?.name || authUser.email,
        role: selectedRole,
        subject: '',
        class: '',
        phone: '',
      },
      shouldCreateProfile: true,
    };
  }

  // Profile already exists — use it as-is.
  return { profile, shouldCreateProfile: false };
}

/**
 * Upserts the `profiles` row, and — if the role is 'teacher' —
 * makes sure a matching `teachers` row exists too. Returns whichever
 * errors occurred so the caller can decide how to warn the user.
 *
 * @param {object} supabase
 * @param {object} params
 * @param {object} params.authUser
 * @param {string} params.selectedRole
 * @param {object} params.profileData - fields for the profiles table
 * @param {object} params.teacherData - extra teacher-only fields
 *   (qualification, experience_years, status)
 * @returns {{ profile: object|null, profileError: object|null, teacherError: object|null }}
 */
export async function syncProfileAndTeacher(supabase, { authUser, selectedRole, profileData, teacherData }) {
  const role = profileData?.role || selectedRole;

  // ── 1. Upsert profiles (safe: user_id is the primary key, so
  //       onConflict works reliably here). Only send columns that
  //       actually exist on the table.
  const profilePayload = {
    user_id: authUser.id,
    email: profileData?.email ?? authUser.email,
    name: profileData?.name ?? authUser.user_metadata?.name ?? authUser.email,
    role,
    subject: profileData?.subject ?? '',
    class: profileData?.class ?? '',
    phone: profileData?.phone ?? '',
  };

  const { data: upsertedProfile, error: profileError } = await supabase
    .from('profiles')
    .upsert(profilePayload, { onConflict: 'user_id' })
    .select()
    .maybeSingle();

  // ── 2. Only teachers get a teachers row.
  if (role !== 'teacher') {
    return { profile: upsertedProfile || profilePayload, profileError, teacherError: null };
  }

  // The teachers table has no user_id column and (per the shown schema)
  // no guaranteed unique constraint on email, so don't rely on
  // .upsert({...}, {onConflict:'email'}) — that fails if the constraint
  // doesn't exist. Instead: look the row up by email, then insert or
  // update explicitly.
  const { data: existingTeacher, error: lookupError } = await supabase
    .from('teachers')
    .select('*')
    .eq('email', profilePayload.email)
    .maybeSingle();

  if (lookupError) {
    return { profile: upsertedProfile || profilePayload, profileError, teacherError: lookupError };
  }

  const teacherPayload = {
    name: profilePayload.name,
    email: profilePayload.email,
    subject: profilePayload.subject,
    class: profilePayload.class,
    phone: profilePayload.phone,
    qualification: teacherData?.qualification ?? '',
    experience_years: teacherData?.experience_years ?? 0,
    status: teacherData?.status ?? 'active',
  };

  let teacherError = null;

  if (existingTeacher) {
    const { error } = await supabase
      .from('teachers')
      .update(teacherPayload)
      .eq('id', existingTeacher.id);
    teacherError = error;
  } else {
    const { error } = await supabase
      .from('teachers')
      .insert(teacherPayload);
    teacherError = error;
  }

  return { profile: upsertedProfile || profilePayload, profileError, teacherError };
}