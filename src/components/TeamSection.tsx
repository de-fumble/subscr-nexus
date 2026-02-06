
import { Card } from "@/components/ui/card";
import { User, Code, ShieldCheck } from "lucide-react";

export const TeamSection = () => {
    const team = [
        {
            title: "System's Architect/Founder",
            image: "/team-founder.jpg",
            icon: User,
        },
        {
            title: "Software Engineer/QA Tester",
            image: "/team-qa.jpg",
            icon: ShieldCheck,
        },
        {
            title: "Software Engineer",
            image: "/team-engineer.jpg",
            icon: Code,
        },
    ];

    return (
        <section className="py-10 md:py-16 lg:py-20 bg-muted/20">
            <div className="container mx-auto px-4 sm:px-5 md:px-6">
                <div className="max-w-2xl mx-auto mb-10 md:mb-16 text-center">
                    <span className="text-accent font-semibold text-sm uppercase tracking-wider font-mono">Our Team</span>
                    <h2 className="mt-3 md:mt-4 text-2xl md:text-3xl lg:text-4xl font-bold text-foreground font-mono">
                        Meet Our Team
                    </h2>
                    <p className="mt-3 md:mt-4 text-base md:text-lg text-muted-foreground font-mono">
                        The minds behind Recurra
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto">
                    {team.map((member, index) => (
                        <Card key={index} className="overflow-hidden border-border/50 hover:shadow-lg transition-all duration-300 group">
                            <div className="aspect-square bg-muted/50 relative flex items-center justify-center overflow-hidden">
                                {/* Fallback Icon if image fails or for placeholder */}
                                <div className="absolute inset-0 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-muted-foreground">
                                    <member.icon className="w-20 h-20 opacity-20" />
                                </div>
                                {/* Actual Image */}
                                <img
                                    src={member.image !== "placeholder" ? member.image : "/placeholder.svg"}
                                    alt={member.title}
                                    className="w-full h-full object-cover relative z-10 transition-transform duration-500 group-hover:scale-105"
                                />
                            </div>
                            <div className="p-6 text-center">
                                <h3 className="font-bold text-lg text-foreground font-mono">{member.title}</h3>
                                <div className="w-10 h-1 bg-accent/30 mx-auto mt-3 rounded-full" />
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
};
