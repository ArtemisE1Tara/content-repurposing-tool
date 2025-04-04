import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="container max-w-4xl py-12 px-4 mx-auto">
      <Link href="/" className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-8">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Home
      </Link>
      
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
      
      <div className="prose dark:prose-invert max-w-none">
        <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
        
        <h2>1. Introduction</h2>
        <p>
          Welcome to Contentful.AI ("we," "our," or "us"). We respect your privacy and are committed 
          to protecting your personal data. This privacy policy will inform you about how we look 
          after your personal data when you visit our website and use our content repurposing services,
          and tell you about your privacy rights and how the law protects you.
        </p>
        
        <h2>2. Data We Collect</h2>
        <p>We may collect, use, store and transfer different kinds of personal data about you:</p>
        <ul>
          <li><strong>Identity Data</strong> includes first name, last name, username or similar identifier.</li>
          <li><strong>Contact Data</strong> includes email address and telephone numbers.</li>
          <li><strong>Technical Data</strong> includes internet protocol (IP) address, browser type and version, time zone setting, browser plug-in types and versions, operating system and platform.</li>
          <li><strong>Usage Data</strong> includes information about how you use our website and services.</li>
          <li><strong>Content Data</strong> includes any content you input into our system for repurposing.</li>
        </ul>
        
        <h2>3. How We Use Your Data</h2>
        <p>We use your data to:</p>
        <ul>
          <li>Provide and manage your account</li>
          <li>Provide our content repurposing services</li>
          <li>Improve our services</li>
          <li>Communicate with you about service updates</li>
          <li>Ensure the security of our platform</li>
        </ul>
        
        <h2>4. Data Security</h2>
        <p>
          We have implemented appropriate security measures to prevent your personal data from being 
          accidentally lost, used, or accessed in an unauthorized way. We limit access to your personal 
          data to those employees, agents, contractors, and other third parties who have a business need to know.
        </p>
        
        <h2>5. Data Retention</h2>
        <p>
          We will only retain your personal data for as long as necessary to fulfill the purposes we 
          collected it for, including for the purposes of satisfying any legal, accounting, or reporting requirements.
        </p>
        
        <h2>6. Your Legal Rights</h2>
        <p>Under certain circumstances, you have rights under data protection laws in relation to your personal data, including:</p>
        <ul>
          <li>The right to request access to your personal data</li>
          <li>The right to request correction of your personal data</li>
          <li>The right to request erasure of your personal data</li>
          <li>The right to object to processing of your personal data</li>
          <li>The right to request restriction of processing your personal data</li>
          <li>The right to request transfer of your personal data</li>
          <li>The right to withdraw consent</li>
        </ul>
        
        <h2>7. Third-Party Services</h2>
        <p>
          Our service may contain links to third-party websites, plug-ins, and applications. Clicking 
          on those links or enabling those connections may allow third parties to collect or share data 
          about you. We do not control these third-party websites and are not responsible for their privacy statements.
        </p>
        
        <h2>8. Changes to This Privacy Policy</h2>
        <p>
          We may update our privacy policy from time to time. We will notify you of any changes by 
          posting the new privacy policy on this page and updating the "Last updated" date.
        </p>
        
        <h2>9. Contact Us</h2>
        <p>
          If you have any questions about this privacy policy or our privacy practices, please contact 
          us at <a href="mailto:privacy@contentful.ai" className="text-primary hover:underline">privacy@contentful.ai</a>.
        </p>
      </div>
    </div>
  );
}
