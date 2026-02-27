
import { Card } from "@/components/ui/card";
import { User, Code, ShieldCheck } from "lucide-react";

export const TeamSection = () => {
    const team = [
        {
            name: "Daniel Oyewole",
            title: "System's Architect/Founder",
            image: "/team-founder.jpg",
            icon: User,
        },
        {
            name: "Okiefe Gift",
            title: "Software Engineer/QA Tester",
            image: "/team-qa.jpg",
            icon: ShieldCheck,
        },
        {
            name: "Funsho Gbenga",
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

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 max-w-3xl mx-auto">
                    {team.map((member, index) => (
                        <Card key={index} className="overflow-hidden border-border/50 hover:shadow-lg transition-all duration-300 group">
                            <div className="aspect-[3/4] bg-muted/50 relative flex items-center justify-center overflow-hidden">
                                {/* Fallback Icon if image fails or for placeholder */}
                                <div className="absolute inset-0 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-muted-foreground">
                                    <member.icon className="w-14 h-14 opacity-20" />
                                </div>
                                {/* Actual Image - optimized with lazy loading */}
                                <img
                                    src={member.image !== "placeholder" ? member.image : "/placeholder.svg"}
                                    alt={member.name}
                                    loading="lazy"
                                    decoding="async"
                                    className="w-full h-full object-cover object-top relative z-10 transition-transform duration-500 group-hover:scale-105"
                                />
                            </div>
                            <div className="p-3 sm:p-4 text-center">
                                <h3 className="font-bold text-sm sm:text-base text-foreground font-mono">{member.name}</h3>
                                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 font-mono">{member.title}</p>
                                <div className="w-8 h-0.5 bg-accent/30 mx-auto mt-2 rounded-full" />
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
};
