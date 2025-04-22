
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MONAD_RESOURCES } from "@/config/monad";
import { ArrowRight, Database, FileCode, Link as LinkIcon, Search, Wallet } from "lucide-react";

const Resources: React.FC = () => {
  const resources = [
    {
      title: "Monad Documentation",
      description: "Official documentation and guides for developers",
      link: MONAD_RESOURCES.documentation,
      icon: <FileCode className="h-5 w-5" />,
    },
    {
      title: "Monad GitHub",
      description: "Open source repositories and developer resources",
      link: MONAD_RESOURCES.github,
      icon: <Database className="h-5 w-5" />,
    },
    {
      title: "Monad Explorer",
      description: "Explore blocks, transactions, and contracts on the Monad Testnet",
      link: MONAD_RESOURCES.explorer,
      icon: <Search className="h-5 w-5" />,
    },
    {
      title: "Monad Blog",
      description: "Latest news, updates and technical insights about Monad",
      link: MONAD_RESOURCES.blog,
      icon: <LinkIcon className="h-5 w-5" />,
    },
    {
      title: "Monad Faucet",
      description: "Get testnet tokens for development and testing",
      link: MONAD_RESOURCES.faucet,
      icon: <Wallet className="h-5 w-5" />,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-monad-primary mb-2">Monad Resources</h1>
        <p className="text-gray-600">
          Essential links and resources for the Monad ecosystem
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {resources.map((resource) => (
          <Card key={resource.title} className="overflow-hidden hover:shadow-md transition-shadow">
            <CardHeader className="border-b pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="bg-monad-primary p-2 rounded-md text-white">
                    {resource.icon}
                  </div>
                  <CardTitle>{resource.title}</CardTitle>
                </div>
                <a 
                  href={resource.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-monad-primary hover:text-monad-accent flex items-center"
                >
                  <span className="mr-1">Visit</span>
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
              <CardDescription className="mt-2">
                {resource.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-sm overflow-hidden text-ellipsis">
                <a 
                  href={resource.link}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  {resource.link}
                </a>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12 text-center border-t pt-8">
        <h3 className="text-lg font-semibold mb-4">Join the Monad Community</h3>
        <div className="flex justify-center space-x-4">
          <a 
            href="https://twitter.com/monad_xyz" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-monad-primary hover:text-monad-accent"
          >
            Twitter
          </a>
          <a 
            href="https://discord.gg/monad" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-monad-primary hover:text-monad-accent"
          >
            Discord
          </a>
          <a 
            href="https://t.me/monad_xyz" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-monad-primary hover:text-monad-accent"
          >
            Telegram
          </a>
        </div>
      </div>
    </div>
  );
};

export default Resources;
