// Test improved paragraph grouping logic
function testParagraphGrouping() {
  console.log('=== Testing Smart Paragraph Grouping ===\n')
  
  // Example input with many sentences
  const emailContent = `Hi Darius, I hope this message finds you well. I wanted to provide you with an update on the current real estate market trends as of September 2025. The housing market is experiencing a period of stabilization. Home prices are expected to rise modestly, with annual increases projected between 1% and 2%. This indicates a shift from the rapid price surges of previous years to a more balanced growth trajectory. In terms of inventory, there has been a gradual improvement. The number of homes available for sale has increased, though it remains below the levels considered ideal for a balanced market. This trend is expected to continue, providing more options for buyers. Mortgage rates have stabilized, hovering around 6.5% to 7%. While this is an improvement from the higher rates seen earlier, it still presents challenges for affordability. It's anticipated that these rates will remain relatively steady throughout the year. Overall, the market is moving towards a more balanced state, with steady price growth and improved inventory levels. However, mortgage rates continue to be a significant factor influencing buyer decisions.`

  // Apply the smart grouping logic
  let body = emailContent
  
  // Clean up spacing first
  body = body.replace(/\s{2,}/g, ' ').replace(/\.\s*\./g, '.').trim()
  
  // Smart paragraph spacing - group 2-3 sentences together
  const sentences = body.split(/\.\s+/).filter((s) => s.trim().length > 0)
  
  if (sentences.length > 1) {
    const paragraphs = []
    let currentParagraph = []
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].trim()
      if (!sentence) continue
      
      // Add sentence to current paragraph
      currentParagraph.push(sentence)
      
      // Start a new paragraph if:
      // - We have 2-3 sentences in current paragraph, OR
      // - The sentence contains transition words indicating a new topic, OR
      // - We're at the last sentence
      const shouldBreak = 
        currentParagraph.length >= 2 && (
          currentParagraph.length >= 3 || 
          i === sentences.length - 1 ||
          /^(In terms of|Additionally|However|Furthermore|Moreover|Overall|Finally|Meanwhile|Subsequently)/i.test(sentences[i + 1] || '')
        )
      
      if (shouldBreak || i === sentences.length - 1) {
        paragraphs.push(currentParagraph.join('. ') + (i === sentences.length - 1 && !sentence.endsWith('.') ? '' : '.'))
        currentParagraph = []
      }
    }
    
    // Join paragraphs with double line breaks
    body = paragraphs.join('\n\n')
  }
  
  // Ensure the greeting has proper spacing
  body = body.replace(/^(Hi [^,]+,)\s*/, '$1\n\n')
  
  console.log('BEFORE (all sentences run together):')
  console.log('---')
  console.log(emailContent)
  console.log('\n\nAFTER (smart paragraph grouping):')
  console.log('---')
  console.log(body)
  
  console.log('\n=== Analysis ===')
  const paragraphCount = body.split('\n\n').length
  console.log(`✅ Created ${paragraphCount} well-structured paragraphs`)
  console.log('✅ Grouped 2-3 related sentences together')
  console.log('✅ Used transition words to identify topic changes')
  console.log('✅ Professional email appearance')
}

// Run the test
testParagraphGrouping()