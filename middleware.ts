import { authMiddleware } from "@clerk/nextjs/server";

export default authMiddleware({
  // Public routes that don't require authentication
  publicRoutes: ["/sign-in", "/sign-up", "/api/webhooks/stripe", "/api/stripe/checkout"],
});

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
