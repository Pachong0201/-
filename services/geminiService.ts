import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, TransactionType, Language } from "../types";
import { ALL_CATEGORIES } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Parse natural language input into structured transaction data
export const parseTransactionInput = async (input: string): Promise<Partial<Transaction> | null> => {
  try {
    const categoryNames = ALL_CATEGORIES.map(c => c.name).join(", ");
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Parse this financial transaction text: "${input}". 
      Map it to one of these exact English category names if possible (even if input is in another language): ${categoryNames}.
      If the type (expense/income) is not clear, infer it from the context.
      If no category fits perfectly, choose the closest one or 'Other'.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER },
            categoryName: { type: Type.STRING },
            type: { type: Type.STRING, enum: ["EXPENSE", "INCOME"] },
            note: { type: Type.STRING },
            date: { type: Type.STRING, description: "YYYY-MM-DD format if mentioned, otherwise null" }
          },
          required: ["amount", "type", "note"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    
    if (!result.amount) return null;

    // Find matching category ID
    const category = ALL_CATEGORIES.find(c => 
      c.name.toLowerCase() === result.categoryName?.toLowerCase()
    );

    return {
      amount: result.amount,
      categoryId: category ? category.id : (result.type === "INCOME" ? 'other_income' : 'shopping'),
      type: result.type === "INCOME" ? TransactionType.INCOME : TransactionType.EXPENSE,
      note: result.note,
      date: result.date || new Date().toISOString()
    };
  } catch (error) {
    console.error("Error parsing transaction with Gemini:", error);
    return null;
  }
};

// Generate financial insights based on transaction history
export const getFinancialInsights = async (transactions: Transaction[], language: Language): Promise<string> => {
  try {
    // Simplify data for the prompt to save tokens
    const simplifiedData = transactions.slice(0, 50).map(t => ({
      amount: t.amount,
      type: t.type,
      category: ALL_CATEGORIES.find(c => c.id === t.categoryId)?.name || t.categoryId,
      date: t.date.split('T')[0]
    }));

    const langName = language === 'zh' ? 'Chinese' : language === 'de' ? 'German' : 'English';

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analyze these recent financial transactions and provide a brief, helpful insight or advice in markdown format. 
      Focus on spending habits, potential savings, or encouraging good behavior. 
      Keep it friendly but professional. Max 2 paragraphs.
      IMPORTANT: Respond in ${langName}.
      
      Data: ${JSON.stringify(simplifiedData)}`,
    });

    return response.text || "Unable to generate insights at the moment.";
  } catch (error) {
    console.error("Error getting insights:", error);
    return "Sorry, I couldn't analyze your data right now.";
  }
};
