import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { internalAPIService, EmailInterestData } from "@/services/internal-api.service";
import { ArrowRight, CheckCircle } from "lucide-react";

const emailInterestSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  email: z.string().email("Please enter a valid email address"),
  updatesConsent: z.boolean().refine(val => val === true, {
    message: "You must consent to receive updates to continue"
  }),
  relatedInitiativesConsent: z.boolean().optional(),
});

type EmailInterestFormData = z.infer<typeof emailInterestSchema>;

export const EmailInterestForm = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EmailInterestFormData>({
    resolver: zodResolver(emailInterestSchema),
    defaultValues: {
      name: "",
      email: "",
      updatesConsent: false,
      relatedInitiativesConsent: false,
    },
  });

  const updatesConsent = watch("updatesConsent");
  const relatedInitiativesConsent = watch("relatedInitiativesConsent");

  const onSubmit = async (data: EmailInterestFormData) => {
    try {
      setIsSubmitting(true);
      
      const params: EmailInterestData = {
        name: data.name,
        email: data.email,
        updatesConsent: data.updatesConsent,
        relatedInitiativesConsent: data.relatedInitiativesConsent || false,
      };

      const result = await internalAPIService.submitEmailInterest(params);
      
      if (result.success) {
        setIsSubmitted(true);
        toast.success(result.message || "Thank you! We'll keep you updated.");
      }
    } catch (error) {
      console.error("Email interest submission error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="max-w-md mx-auto text-center space-y-4">
        <div className="flex justify-center">
          <CheckCircle className="w-16 h-16 text-terminal-green animate-pulse" />
        </div>
        <h3 className="text-xl font-bold text-terminal-green font-mono">
          YOU'RE ON THE LIST!
        </h3>
        <p className="text-terminal-text-muted">
          We'll keep you updated on Midnight Protocol development.
        </p>
        <div className="text-sm text-terminal-cyan font-mono">
          Welcome to the future of networking.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl md:text-2xl font-bold text-terminal-green mb-2 font-mono">
          GET EARLY ACCESS
        </h3>
        <p className="text-terminal-text-muted text-sm">
          Be first to know when we launch
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Name Field */}
        <div>
          <Input
            {...register("name")}
            placeholder="Your name"
            className="bg-terminal-bg/50 border-terminal-cyan/30 text-terminal-text placeholder:text-terminal-text-muted focus:border-terminal-cyan font-mono"
            disabled={isSubmitting}
          />
          {errors.name && (
            <p className="text-red-400 text-xs mt-1 font-mono">{errors.name.message}</p>
          )}
        </div>

        {/* Email Field */}
        <div>
          <Input
            {...register("email")}
            type="email"
            placeholder="your@email.com"
            className="bg-terminal-bg/50 border-terminal-cyan/30 text-terminal-text placeholder:text-terminal-text-muted focus:border-terminal-cyan font-mono"
            disabled={isSubmitting}
          />
          {errors.email && (
            <p className="text-red-400 text-xs mt-1 font-mono">{errors.email.message}</p>
          )}
        </div>

        {/* Required Consent Checkbox */}
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="updatesConsent"
              checked={updatesConsent}
              onCheckedChange={(checked) => setValue("updatesConsent", checked as boolean)}
              className="border-terminal-cyan/30 data-[state=checked]:bg-terminal-green data-[state=checked]:border-terminal-green mt-0.5"
              disabled={isSubmitting}
            />
            <label 
              htmlFor="updatesConsent" 
              className="text-sm text-terminal-text leading-relaxed cursor-pointer"
            >
              I consent to receive updates about Midnight Protocol development
              <span className="text-red-400 ml-1">*</span>
            </label>
          </div>
          {errors.updatesConsent && (
            <p className="text-red-400 text-xs font-mono ml-6">{errors.updatesConsent.message}</p>
          )}

          {/* Optional Consent Checkbox */}
          <div className="flex items-start space-x-3">
            <Checkbox
              id="relatedInitiativesConsent"
              checked={relatedInitiativesConsent}
              onCheckedChange={(checked) => setValue("relatedInitiativesConsent", checked as boolean)}
              className="border-terminal-cyan/30 data-[state=checked]:bg-terminal-green data-[state=checked]:border-terminal-green mt-0.5"
              disabled={isSubmitting}
            />
            <label 
              htmlFor="relatedInitiativesConsent" 
              className="text-sm text-terminal-text-muted leading-relaxed cursor-pointer"
            >
              I'm interested in occasional updates about related initiatives
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-terminal-green text-terminal-bg hover:bg-terminal-cyan transition-all duration-300 font-mono text-base px-8 py-6 shadow-lg hover:shadow-terminal-green/20 hover:scale-105 font-bold disabled:opacity-50"
        >
          {isSubmitting ? 'Submitting...' : 'Join the Waitlist'}
          {!isSubmitting && <ArrowRight className="w-4 h-4 ml-2 animate-pulse" />}
        </Button>
      </form>

      <div className="text-center">
        <p className="text-terminal-text-muted text-xs">
          No spam • Unsubscribe anytime • Early access guaranteed
        </p>
      </div>
    </div>
  );
};