
import { Card } from "@/components/ui/card";
import { User, Code, ShieldCheck } from "lucide-react";

export const TeamSection = () => {
    const team = [
        {
            name: "Daniel Oyewole",
            title: "System's Architect/Founder",
            image: "/team-founder.jpg",
            icon: User,
            imagePosition: "object-top",
        },
        {
            name: "Okiefe Gift",
            title: "Software Engineer/QA Tester",
            image: "/team-qa.jpg",
            icon: ShieldCheck,
            imagePosition: "object-top",
        },
        {
            name: "Funsho Gbenga",
            title: "Software Engineer",
            image: "/team-engineer.jpg",
            icon: Code,
            imagePosition: "object-center",
        },
        {
            name: "Chukwu Bright",
            title: "Software Engineer/Marketing Lead",
            image: "/team-marketing.jpg",
            icon: User,
            imagePosition: "object-top",
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

                {/* Mobile: Round avatars in a 2x2 grid */}
                <div className="grid grid-cols-2 md:hidden gap-x-4 gap-y-8 max-w-[320px] mx-auto">
                    {team.map((member, index) => (
                        <div key={index} className="flex flex-col items-center text-center group">
                            <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-accent/20 shadow-md mb-3 group-hover:border-accent/50 transition-all duration-300">
                                {/* Fallback Icon */}
                                <div className="absolute inset-0 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-muted-foreground">
                                    <member.icon className="w-8 h-8 opacity-20" />
                                </div>
                                <img
                                    src={member.image !== "placeholder" ? member.image : "/placeholder.svg"}
                                    alt={member.name}
                                    loading="lazy"
                                    decoding="async"
                                    className={`w-full h-full object-cover ${member.imagePosition} relative z-10`}
                                />
                            </div>
                            <h3 className="font-bold text-xs text-foreground font-mono leading-tight">{member.name}</h3>
                            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono leading-tight">{member.title}</p>
                        </div>
                    ))}
                </div>

                {/* Desktop: Card layout */}
                <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
                    {team.map((member, index) => (
                        <Card key={index} className="overflow-hidden border-border/50 hover:shadow-lg transition-all duration-300 group pt-8 pb-6 px-4">
                            <div className="w-32 h-32 lg:w-40 lg:h-40 mx-auto rounded-full bg-muted/50 relative flex items-center justify-center overflow-hidden mb-5 border-4 border-accent/10 group-hover:border-accent/40 transition-all duration-500 shadow-md">
                                <div className="absolute inset-0 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-muted-foreground">
                                    <member.icon className="w-12 h-12 opacity-20" />
                                </div>
                                <img
                                    src={member.image !== "placeholder" ? member.image : "/placeholder.svg"}
                                    alt={member.name}
                                    loading="lazy"
                                    decoding="async"
                                    className={`w-full h-full object-cover ${member.imagePosition} relative z-10 transition-transform duration-500 group-hover:scale-110`}
                                />
                            </div>
                            <div className="text-center">
                                <h3 className="font-bold text-lg text-foreground font-mono">{member.name}</h3>
                                <p className="text-sm text-muted-foreground mt-1 font-mono">{member.title}</p>
                                <div className="w-10 h-0.5 bg-accent/50 mx-auto mt-3 rounded-full transition-all duration-300 group-hover:w-16" />
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
};
