
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BASE_RESOURCES } from "@/config/base";
import { ArrowRight, Database, FileCode, Link as LinkIcon, Search, ArrowLeftRight } from "lucide-react";

const Resources: React.FC = () => {
  const resources = [
    {
      title: "Base Documentation",
      description: "Official documentation and guides for developers (docs.base.org)",
      link: BASE_RESOURCES.documentation,
      icon: <FileCode className="h-5 w-5" />,
    },
    {
      title: "Base GitHub",
      description: "Open source repositories and developer resources",
      link: BASE_RESOURCES.github,
      icon: <Database className="h-5 w-5" />,
    },
    {
      title: "Base Explorer (Basescan)",
      description: "Explore blocks, transactions, and contracts on Base Mainnet",
      link: BASE_RESOURCES.explorer,
      icon: <Search className="h-5 w-5" />,
    },
    {
      title: "Base Blog",
      description: "Latest news, updates and technical insights about Base",
      link: BASE_RESOURCES.blog,
      icon: <LinkIcon className="h-5 w-5" />,
    },
    {
      title: "Base Bridge",
      description: "Bridge ETH and tokens between Ethereum Mainnet and Base",
      link: BASE_RESOURCES.bridge,
      icon: <ArrowLeftRight className="h-5 w-5" />,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-base-primary mb-2">Base Resources</h1>
        <p className="text-gray-600">
          Essential links and resources for the Base ecosystem
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {resources.map((resource) => (
          <Card key={resource.title} className="overflow-hidden hover:shadow-md transition-shadow">
            <CardHeader className="border-b pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="bg-base-primary p-2 rounded-md text-white">
                    {resource.icon}
                  </div>
                  <CardTitle>{resource.title}</CardTitle>
                </div>
                <a 
                  href={resource.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-base-primary hover:text-base-accent flex items-center"
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
        <h3 className="text-lg font-semibold mb-4">Join the Base Community</h3>
        <div className="flex justify-center space-x-4">
          <a 
            href="https://twitter.com/base" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-base-primary hover:text-base-accent"
          >
            Twitter
          </a>
          <a 
            href="https://discord.gg/buildonbase" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-base-primary hover:text-base-accent"
          >
            Discord
          </a>
          <a 
            href="https://twitter.com/base" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-base-primary hover:text-base-accent"
          >
            Telegram
          </a>
        </div>
      </div>
    </div>
  );
};

export default Resources;
