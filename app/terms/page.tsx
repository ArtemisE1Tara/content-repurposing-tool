import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="container max-w-4xl py-12 px-4 mx-auto">
      <Link href="/" className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-8">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Home
      </Link>
      
      <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
      
      <div className="prose dark:prose-invert max-w-none">
        <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
        
        <h2>1. Agreement to Terms</h2>
        <p>
          By accessing or using the Contentful.AI content repurposing service ("Service"), you agree to be bound 
          by these Terms of Service ("Terms"). If you disagree with any part of the terms, you may not access the Service.
        </p>
        
        <h2>2. Description of Service</h2>
        <p>
          Contentful.AI provides AI-powered content repurposing tools that help users transform their content 
          for various platforms and formats. Our Service includes content analysis, transformation, and optimization.
        </p>
        
        <h2>3. User Accounts</h2>
        <p>
          When you create an account with us, you must provide accurate, complete, and current information. 
          You are responsible for safeguarding the password and for all activities that occur under your account.
        </p>
        
        <h2>4. Subscription and Billing</h2>
        <p>
          Some aspects of the Service may be provided for a fee. You will be billed in advance on a recurring 
          basis, depending on the type of subscription plan you select. We may change the fees for the Service 
          at any time, providing you with prior notice.
        </p>
        
        <h2>5. User Content</h2>
        <p>
          Our Service allows you to input, upload, and process content. You retain all rights to your content, 
          but you grant us a license to use, modify, and process it for the purpose of providing our Service.
          You represent and warrant that you own or have the necessary rights to the content you provide, 
          and that such content does not violate the rights of any third party.
        </p>
        
        <h2>6. Intellectual Property</h2>
        <p>
          The Service and its original content (excluding content provided by users), features, and functionality 
          are and will remain the exclusive property of Contentful.AI and its licensors. The Service is protected 
          by copyright, trademark, and other laws.
        </p>
        
        <h2>7. Prohibited Uses</h2>
        <p>You agree not to use the Service:</p>
        <ul>
          <li>For any unlawful purpose or to violate any laws</li>
          <li>To infringe upon or violate our intellectual property rights or those of others</li>
          <li>To harass, abuse, insult, harm, defame, slander, or discriminate against others</li>
          <li>To submit false or misleading information</li>
          <li>To upload or transmit viruses or malicious code</li>
          <li>To interfere with or circumvent security features of the Service</li>
        </ul>
        
        <h2>8. Termination</h2>
        <p>
          We may terminate or suspend your account immediately, without prior notice or liability, for any reason, 
          including if you breach the Terms. Upon termination, your right to use the Service will immediately cease.
        </p>
        
        <h2>9. Limitation of Liability</h2>
        <p>
          In no event shall Contentful.AI, nor its directors, employees, partners, agents, suppliers, or affiliates, 
          be liable for any indirect, incidental, special, consequential, or punitive damages, including without 
          limitation, loss of profits, data, use, goodwill, or other intangible losses.
        </p>
        
        <h2>10. Changes to Terms</h2>
        <p>
          We reserve the right to modify or replace these Terms at any time. It is your responsibility to review 
          these Terms periodically for changes. Your continued use of the Service following the posting of any 
          changes constitutes acceptance of those changes.
        </p>
        
        <h2>11. Governing Law</h2>
        <p>
          These Terms shall be governed by the laws of the jurisdiction in which our company is registered, 
          without regard to its conflict of law provisions.
        </p>
        
        <h2>12. Contact Us</h2>
        <p>
          If you have any questions about these Terms, please contact us at <a href="mailto:terms@contentful.ai" className="text-primary hover:underline">terms@contentful.ai</a>.
        </p>
      </div>
    </div>
  );
}
