export function resolveLoginProfile({ authUser, selectedRole, profile, profileError }) {
  const fallbackName = authUser?.user_metadata?.full_name || authUser?.email || 'School User';
  const fallbackRole = selectedRole || 'teacher';

  const isMissingProfile = Boolean(profileError) || !profile;
  const shouldCreateProfile = isMissingProfile && Boolean(authUser?.id);

  return {
    profile: {
      user_id: authUser?.id || null,
      email: authUser?.email || '',
      name: profile?.name || fallbackName,
      role: profile?.role || fallbackRole,
      subject: profile?.subject || '',
      class: profile?.class || '',
      phone: profile?.phone || '',
    },
    shouldCreateProfile,
    isMissingProfile,
  };
}

export function buildProfilePayload({ authUser, selectedRole, profileData }) {
  const fallbackName = authUser?.user_metadata?.full_name || authUser?.email || 'School User';
  return {
    user_id: authUser?.id || profileData?.user_id || null,
    email: profileData?.email || authUser?.email || '',
    name: profileData?.name || fallbackName,
    role: profileData?.role || selectedRole || 'teacher',
    subject: profileData?.subject || '',
    class: profileData?.class || '',
    phone: profileData?.phone || '',
  };
}

export async function syncProfileAndTeacher(supabase, { authUser, selectedRole, profileData, teacherData }) {
  if (!supabase || !authUser?.id) {
    return { profile: null, profileError: null, teacherError: null };
  }

  const profilePayload = buildProfilePayload({ authUser, selectedRole, profileData });
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .upsert([profilePayload], { onConflict: 'user_id' })
    .select('*')
    .maybeSingle();

  let teacherError = null;
  if (profile?.role === 'teacher') {
    const teacherPayload = {
      name: profilePayload.name,
      email: profilePayload.email,
      phone: profilePayload.phone,
      subject: profilePayload.subject,
      class: profilePayload.class,
      qualification: teacherData?.qualification || '',
      experience_years: teacherData?.experience_years || 0,
      status: teacherData?.status || 'active',
    };

    const { data: existingTeachers, error: lookupError } = await supabase
      .from('teachers')
      .select('*')
      .eq('email', teacherPayload.email)
      .limit(1);

    if (!lookupError && existingTeachers?.length) {
      const existing = existingTeachers[0];
      const { error: updateError } = await supabase.from('teachers').update(teacherPayload).eq('id', existing.id);
      teacherError = updateError;
    } else if (!lookupError) {
      const { error: insertError } = await supabase.from('teachers').insert([teacherPayload]);
      teacherError = insertError;
    } else {
      teacherError = lookupError;
    }
  }

  return { profile, profileError, teacherError };
}
