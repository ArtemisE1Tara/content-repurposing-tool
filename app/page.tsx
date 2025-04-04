import LandingPage from "@/components/landing-page";
import { currentUser } from "@clerk/nextjs";
import { redirect } from "next/navigation";

export default async function Home() {
  const user = await currentUser();
  
  // If user is already signed in, redirect to dashboard
  if (user) {
    redirect("/dashboard");
  }
  
  // Otherwise, show the landing page
  return <LandingPage />;
}

