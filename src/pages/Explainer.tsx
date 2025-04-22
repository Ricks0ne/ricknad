
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { MONAD_RESOURCES } from "@/config/monad";

const Explainer: React.FC = () => {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sample explanation content from Monad documentation
  const explanations = {
    "what is monad": {
      content: "Monad is a high-performance Layer 1 blockchain designed for maximum performance and decentralization. It features a specialized transaction processing architecture that allows for parallel execution of smart contracts, enabling much higher throughput compared to traditional blockchain architectures.",
      sources: ["https://docs.monad.xyz/overview"]
    },
    "how fast is monad": {
      content: "Monad delivers high throughput and low latency. It can process thousands of transactions per second with sub-second finality, thanks to its parallel execution model and optimized architecture.",
      sources: ["https://docs.monad.xyz/overview"]
    },
    "what language does monad use": {
      content: "Monad is fully EVM-compatible, which means it supports Solidity, the same programming language used by Ethereum. This allows developers to easily port their existing Ethereum dApps to Monad without changing the code.",
      sources: ["https://docs.monad.xyz/developers/guide"]
    },
    "default": {
      content: "Monad is a high-performance Layer 1 blockchain built from the ground up for scalability without sacrificing decentralization. It features parallel transaction execution, EVM compatibility for easy migration of Ethereum dApps, and a novel consensus mechanism designed for high throughput and security.",
      sources: ["https://docs.monad.xyz/overview", "https://www.monad.xyz/blog"]
    }
  };

  const getExplanation = async () => {
    if (!query) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real app, this would call an AI service with access to Monad docs
      // For demo purposes, we'll use a basic lookup system
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const normQuery = query.toLowerCase().trim();
      let result;
      
      // Find the most relevant explanation
      for (const [key, value] of Object.entries(explanations)) {
        if (normQuery.includes(key)) {
          result = value;
          break;
        }
      }
      
      // Use default if no match found
      if (!result) {
        result = explanations.default;
      }
      
      // Format the answer with sources
      const formattedAnswer = `
${result.content}

Sources:
${result.sources.map(source => `- [${source}](${source})`).join('\n')}
      `;
      
      setAnswer(formattedAnswer);
    } catch (err) {
      console.error('Error getting explanation:', err);
      setError('Failed to get an explanation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-monad-primary mb-2">Monad Explainer</h1>
        <p className="text-gray-600">
          Ask anything about Monad and get AI-powered explanations
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Ask About Monad</CardTitle>
          <CardDescription>
            Type your question about Monad, its technology, or ecosystem
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
            placeholder="What is Monad? How does it achieve scalability?"
            rows={3}
            className="resize-none"
          />
          
          <Button 
            className="w-full bg-monad-primary hover:bg-monad-accent hover:text-black"
            onClick={getExplanation}
            disabled={isLoading || !query}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Getting Answer...' : 'Ask Monad'}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Alert className="mb-6">
          <AlertDescription className="text-red-500">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {answer && (
        <Card>
          <CardHeader>
            <CardTitle>Monad Answer</CardTitle>
            <CardDescription>
              Based on official Monad documentation and resources
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose">
              {answer.split('\n\n').map((paragraph, idx) => (
                <p key={idx}>
                  {paragraph.startsWith('Sources:') ? (
                    <strong>Sources:</strong>
                  ) : paragraph.startsWith('- [') ? (
                    <a 
                      href={paragraph.split('](')[1].replace(')', '')} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-monad-primary hover:text-monad-accent"
                    >
                      {paragraph.split('](')[0].replace('- [', '')}
                    </a>
                  ) : (
                    paragraph
                  )}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-2">Popular Questions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            "What is Monad?",
            "How does Monad achieve scalability?",
            "Is Monad EVM compatible?",
            "What makes Monad different?",
          ].map((q) => (
            <Button
              key={q}
              variant="outline"
              className="justify-start"
              onClick={() => {
                setQuery(q);
                getExplanation();
              }}
            >
              {q}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Explainer;
