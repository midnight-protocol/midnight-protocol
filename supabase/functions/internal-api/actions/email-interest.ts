
export interface EmailInterestData {
  name: string;
  email: string;
  updatesConsent: boolean;
  relatedInitiativesConsent: boolean;
}

export async function submitEmailInterest(supabase: any, params: EmailInterestData, user?: any, databaseUser?: any) {

  const { name, email, updatesConsent, relatedInitiativesConsent } = params;

  // Validate required fields
  if (!name || !email || typeof updatesConsent !== 'boolean') {
    throw new Error("Name, email, and updates consent are required");
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error("Please enter a valid email address");
  }

  try {
    const { data, error } = await supabase
      .from("email_interests")
      .insert({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        updates_consent: updatesConsent,
        related_initiatives_consent: relatedInitiativesConsent || false,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error("This email has already been submitted");
      }
      throw new Error("Failed to submit email interest: " + error.message);
    }

    return {
      success: true,
      message: "Thank you! We'll keep you updated on Midnight Protocol development.",
      data,
    };
  } catch (error) {
    console.error("Email interest submission error:", error);
    throw error;
  }
}