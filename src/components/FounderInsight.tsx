import { useMemo } from "react";
import { Lightbulb } from "lucide-react";

const quotes = [
    { text: "The most dangerous trap in business is not failure — it is success without understanding why.", author: "Daniel O." },
    { text: "Revenue is vanity, profit is sanity, but cash flow is reality.", author: "Daniel O." },
    { text: "Your best customers are not the ones who pay the most — they are the ones who stay the longest.", author: "Daniel O." },
    { text: "Recurring revenue is not a business model. It is a discipline.", author: "Daniel O." },
    { text: "A product that users return to daily is worth more than one they buy once and forget.", author: "Daniel O." },
    { text: "Solve a problem so completely that your customer never thinks about it again.", author: "Daniel O." },
    { text: "The churn rate tells you the truth your marketing metrics will not.", author: "Daniel O." },
    { text: "Build for retention. Acquisition is expensive, loyalty is compounding.", author: "Daniel O." },
    { text: "Every line of code that touches money must be treated as contract law.", author: "Daniel O." },
    { text: "A complicated pricing page is a revenue leak you do not see on your P&L.", author: "Daniel O." },
    { text: "The most scalable thing you can build is trust.", author: "Daniel O." },
    { text: "Data without context is noise. Context without data is opinion.", author: "Daniel O." },
    { text: "Speed is a feature. The business that moves faster earns compounding advantages.", author: "Daniel O." },
    { text: "Do not A/B test your values. Only test your assumptions.", author: "Daniel O." },
    { text: "Subscriptions are not just payments — they are a standing vote of confidence from your users.", author: "Daniel O." },
    { text: "The best time to fix your onboarding is before you launch. The second best time is now.", author: "Daniel O." },
    { text: "You do not grow a SaaS product — you grow the trust that underpins it.", author: "Daniel O." },
    { text: "If you cannot explain your billing in one sentence, neither can your customer.", author: "Daniel O." },
    { text: "Every failed payment is a conversation waiting to happen.", author: "Daniel O." },
    { text: "A great dashboard does not just show you the past — it helps you predict the future.", author: "Daniel O." },
    { text: "Scale without systems is just chaos at higher throughput.", author: "Daniel O." },
    { text: "The hardest thing to automate is judgment. Build tools that amplify it, not replace it.", author: "Daniel O." },
    { text: "Your pricing is a promise. Your product is whether you kept it.", author: "Daniel O." },
    { text: "Simplicity in UX is not laziness — it is the highest form of respect for your user's time.", author: "Daniel O." },
    { text: "The SaaS founders who win are not the ones who built the most features. They built the right ones.", author: "Daniel O." },
];

export function FounderInsight() {
    const quote = useMemo(() => quotes[Math.floor(Math.random() * quotes.length)], []);

    return (
        <div className="flex items-center gap-2 min-w-0 flex-1">
            <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <p className="text-[10px] sm:text-xs text-muted-foreground italic truncate">
                <span className="not-italic font-semibold text-foreground/60 mr-1">💡</span>
                "{quote.text}"
                <span className="not-italic ml-1.5 font-medium text-muted-foreground/80">— {quote.author}</span>
            </p>
        </div>
    );
}
