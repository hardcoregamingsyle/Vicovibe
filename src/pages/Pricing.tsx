import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { useNavigate } from "react-router";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    tokens: "15M",
    checks: "30",
    projects: "3",
    features: [
      "15M Tokens per Month",
      "Access to Basic Features",
      "30 Full Website Checks",
      "3 Projects Maximum",
      "Community Support",
    ],
    tier: "free",
    popular: false,
  },
  {
    name: "Silver",
    price: "$29",
    period: "/month",
    tokens: "30M",
    checks: "90",
    projects: "5",
    features: [
      "30M Tokens per Month",
      "Access to More Features",
      "90 Full Website Checks",
      "5 Projects Maximum",
      "Priority Support",
      "Advanced Analytics",
    ],
    tier: "silver",
    popular: false,
  },
  {
    name: "Gold",
    price: "$79",
    period: "/month",
    tokens: "45M",
    checks: "300",
    projects: "7",
    features: [
      "45M Tokens per Month",
      "Highest End Models",
      "Advanced Features",
      "300 Full Website Checks",
      "7 Projects Maximum",
      "Premium Support",
      "Custom Integrations",
    ],
    tier: "gold",
    popular: true,
  },
  {
    name: "Diamond",
    price: "$199",
    period: "/month",
    tokens: "100M",
    checks: "700",
    projects: "10",
    features: [
      "100M Tokens per Month",
      "Latest Advanced Models",
      "All Premium Features",
      "700 Full Website Checks",
      "10 Projects Maximum",
      "Dedicated Support",
      "API Access",
      "White-label Options",
    ],
    tier: "diamond",
    popular: false,
  },
];

export default function Pricing() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const handleSelectPlan = (tier: string) => {
    if (!isAuthenticated) {
      navigate("/auth");
    } else {
      // TODO: Implement subscription logic
      console.log("Selected plan:", tier);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Navigation */}
      <nav className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <img src="/logo.svg" alt="Logo" className="h-8 w-8" />
            <span className="font-bold text-xl">AI Vibe Coder</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/")}>Home</Button>
            <Button variant="ghost" onClick={() => navigate("/pricing")}>Pricing</Button>
            {isAuthenticated ? (
              <Button onClick={() => navigate("/projects")}>Dashboard</Button>
            ) : (
              <Button onClick={() => navigate("/auth")}>Sign In</Button>
            )}
          </div>
        </div>
      </nav>

      {/* Pricing Content */}
      <div className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl font-bold tracking-tight mb-4 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Choose Your Plan
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Select the perfect plan for your AI coding needs. Upgrade or downgrade anytime.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className={`relative h-full flex flex-col ${plan.popular ? "border-primary shadow-lg scale-105" : ""}`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      Most Popular
                    </div>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                      <span className="text-muted-foreground">{plan.period}</span>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => handleSelectPlan(plan.tier)}
                  >
                    {user?.subscriptionTier === plan.tier ? "Current Plan" : "Get Started"}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
