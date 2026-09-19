# Modelos abertos de decisão para Sysone

Pesquisa em 19/09/2026. Fontes primárias: publicações dos autores, model cards, pesos publicados e código de inferência. Não houve download de pesos, execução de modelos ou inferência paga. A pesquisa inspecionou contratos e código; depois dela, o adapter HTTP genérico foi implementado e validado com fixtures na versão 0.1.1. Não houve execução dos modelos abertos.

## Conclusão

**Não encontrei uma publicação oficial dos pesos de Jev. Existem, porém, modelos abertos reais e servidores locais capazes de alimentar as três operações do Sysone.** Os candidatos mais relevantes são Bespoke Nimble, o modelo DeBERTa de Kotoba e servidores independentes chamados OpenJev. Nenhum deve ser apresentado como o próprio Jev aberto, nem como equivalente em qualidade ou calibração.

A recomendação é preservar Sysone como biblioteca de decisões, com backends hospedados ou locais, e incluir alternativas abertas como **experimentais** somente depois de implementar e testar seus adapters. A mesma API de programação pode existir; os limites e a interpretação estatística não são automaticamente os mesmos.

## O próprio Jev

A documentação TypeSafe continua oferecendo `jev-1.13.0` e aliases via API. O GitHub oficial publica SDKs, skills e um adapter para APIs de outros LLMs; isso não inclui pesos Jev. A consulta pública ao Hugging Face por autor `typesafe-ai` retornou lista vazia. A ausência nesses locais não prova inexistência absoluta de um release em outro lugar; a formulação sustentada pela pesquisa é **“não foi encontrado um release oficial open weights do Jev em 19/09/2026”**. [Modelos oficiais](https://docs.typesafe.ai/models), [GitHub oficial](https://github.com/typesafe-ai), [consulta HF](https://huggingface.co/api/models?author=typesafe-ai).

## 1. Bespoke-Nimble-9B: candidato principal de modelo treinado

É um adapter LoRA publicado de aproximadamente 165 MiB para Qwen3.5-9B, com tokenizer, construtor de prompt e código de inferência. O checkpoint HF foi criado em 18/09/2026; revisão consultada `594dfdcfb6f94e3d0c0db7535180d3c71689169a`. O adapter e o modelo-base declaram Apache-2.0. Não é distilação do Jev. [Model card e arquivos](https://huggingface.co/bespokelabs/Bespoke-Nimble-9B), [metadados HF](https://huggingface.co/api/models/bespokelabs/Bespoke-Nimble-9B), [base Qwen](https://huggingface.co/Qwen/Qwen3.5-9B).

O código pontua tokens de resposta permitidos diretamente, sem gerar justificativas. Aceita booleanos e enums, com descrições; níveis de rubrica são enums numéricos e produzem expectativa ponderada. Limites documentados: 26 alternativas por campo e 2.048 tokens por prompt, incluindo schema. Prompts maiores são rejeitados. O modelo-base completo precisa estar disponível além do LoRA. [Inferência e contrato do checkpoint](https://huggingface.co/bespokelabs/Bespoke-Nimble-9B/blob/main/README.md).

O projeto oferece caminhos CUDA e Apple Silicon/MLX. No MLX, é necessário preparar pesos mesclados; o runner documentado não aceita adapter LoRA diretamente nem pesos quantizados. O caminho CUDA refaz o prompt para cada campo; o MLX compartilha contexto. Os próprios autores alertam que probabilidades normalizadas não significam frequência empírica de acerto. A avaliação publicada de 324 exemplos sintéticos é estreita; números próximos do Jev nesse conjunto não estabelecem equivalência geral. [Projeto e limitações](https://github.com/bespokelabsai/nimble).

**Viabilidade:** alta para um adapter experimental com serviço Python local. Mapear Noul para boolean; Choice para enum; Score para enum ordinal e calcular a expectativa preservando a distribuição. Falta construir o transporte e medir qualidade, calibração e português. Não inferir que o contexto longo do Qwen-base estende o limite treinado do Nimble.

## 2. Kotoba Open-Jev DeBERTa: menor e mais próximo das primitivas

`com-kotobalabs/open-jev-deberta-v3-large` publica encoder e head de decisão, cerca de 0,4B parâmetros, sob Apache-2.0; a base DeBERTa é MIT. Suporta Choice, Score e Noul em uma passagem, com distribuição sobre alternativas. Há calibração por temperatura ajustada em validação; `confidence` é a maior probabilidade, diferente da estatística TypeSafe.

O limite severo é **512 tokens no total e estado truncado para 256**. O treinamento cobre inglês em três domínios públicos. O card reporta acurácia de 0,854 nas perguntas dentro do domínio e 0,690 em perguntas novas; rubricas novas são especialmente fracas. A calibração medida pertence a esses conjuntos, não a qualquer tarefa. O exemplo de uso requer a biblioteca `typed_decisions` para aplicar corretamente o head; carregar apenas `AutoModel` não substitui esse caminho. [Model card, pesos e limites](https://huggingface.co/com-kotobalabs/open-jev-deberta-v3-large).

**Viabilidade:** alta para protótipos locais curtos via processo/serviço Python; baixa como substituto geral para documentos extensos. Um adapter Sysone deve rejeitar excesso de contexto, evitando herdar truncamento silencioso. Precisa traduzir `criteria` para as opções/instruções que o modelo recebe e preservar a identidade das chaves. [Implementação](https://github.com/kotoba-lang/typed-decisions).

## 3. OpenJev sobre DiffusionGemma: caminho HTTP mais direto

`razorback16/openjev` é um servidor independente, código Apache-2.0, que já oferece `POST /v1/systemone` com Noul/Choice/Score. Usa probabilidades em posições de resposta de DiffusionGemma, não números escritos por um chatbot. Choice limita-se a 128 opções; Score retorna a expectativa ordinal. A confiança é `1 − H(p)/ln K`, sem equivalência presumida à confiança TypeSafe.

O projeto documenta Docker, pesos NVFP4 de cerca de 18 GB e GPU NVIDIA com ao menos 24 GB, testada em Blackwell. Depende de um fork/pin de vLLM com PR ainda não incorporada; suporte em toda GPU de 24 GB não foi demonstrado. O README chama as decisões de calibradas, mas esta pesquisa não encontrou avaliação suficiente para sustentar calibração geral. [Servidor, protocolo e dependências](https://github.com/razorback16/openjev).

A model card NVIDIA descreve os pesos como abertos, indica Apache-2.0 e também referencia termos/política Gemma. Preservar essas referências ao distribuir ou empacotar o backend, em vez de deduzir licença exclusivamente do README do wrapper. [Model card NVIDIA](https://huggingface.co/nvidia/diffusiongemma-26B-A4B-it-NVFP4).

**Viabilidade:** melhor opção para testar rapidamente um backend HTTP compatível quando houver hardware adequado. Reutilizar serialização System One é plausível; não anunciar suporte pronto sem smoke tests e validação da distribuição. Manter extensões `think` e `sequential` desligadas no contrato mínimo para não mudar suas propriedades inadvertidamente.

### Auditoria do contrato HTTP OpenJev

Código consultado na revisão `91d5005effcf8cc0ecccaa9538ceabbb130fef59`, publicada em 18/09/2026. A base local documentada é `http://127.0.0.1:8080`; o caminho é `/v1/systemone`.

`model` é obrigatório e validado; não escolhe pesos diferentes. Os aliases aceitos são `openjev-latest`, `openjev-0.1`, `jev-latest` e `jev-preview`, todos servindo o mesmo backend configurado. `jev-1.13.0` não é aceito. A resposta identifica o modelo como `openjev-0.1`. Autenticação Bearer depende de `OPENJEV_API_KEY`, vazio por padrão; o servidor também pode exigir `x-origin-secret` separadamente. [Configuração](https://github.com/razorback16/openjev/blob/91d5005effcf8cc0ecccaa9538ceabbb130fef59/openjev/config.py).

O payload exige `state`, `model` e `questions` não vazio. Os tipos são `noul`, `choice` e `score`. A resposta contém `model`, `answers` por chave e `usage.input_tokens/output_tokens`. O schema não declara `rounding` e o handler não o aplica; não anunciar suporte a esse parâmetro. Há extensões `steps`, `samples`, `think` e `sequential`, que não fazem parte do contrato mínimo proposto. IDs de request vêm nos headers `x-request-id` e `x-typesafe-request-id`; este último nome não significa que houve chamada à TypeSafe. [Endpoint e schemas](https://github.com/razorback16/openjev/blob/91d5005effcf8cc0ecccaa9538ceabbb130fef59/openjev/api.py).

Noul retorna `noul: p(true)` sem campo `confidence`. Choice retorna `choice`, `probabilities` e `confidence`. Score retorna expectativa ordinal `score`, `legend`, `probabilities` e `confidence`. Os valores não são arredondados pelo endpoint. A confiança de Choice/Score é entropia normalizada invertida. Detalhe de fidelidade: a distribuição usa logprobs **top-k**; quando o token de uma alternativa está ausente, o código aproxima seu logprob pelo menor valor recebido menos cinco, antes do softmax. Algumas leituras podem ser agregadas por média. Assim, a origem correta é uma distribuição de candidatos derivada de logits com aproximação, não uma alegação de probabilidades exatas ou calibradas. [Conversão e distribuição](https://github.com/razorback16/openjev/blob/91d5005effcf8cc0ecccaa9538ceabbb130fef59/openjev/engine.py).

**Decisão de integração:** um adapter HTTP genérico System One é concreto e plausível, com autenticação opcional e validação do contrato. Fixtures comprovam serialização e parsing, não execução local ou qualidade do modelo. Registrar o backend de origem e a definição da confiança nos metadados; não colocar essa confiança em um namespace `typesafe` nem reutilizar limiares sem avaliação. O servidor é compatível com o subconjunto básico de formatos inspecionado, não uma substituição integral verificada da API TypeSafe.

## Outros candidatos e distinções

`AlexWortega/openjev` publica pesos Qwen3.5-4B ajustados como cross-encoder NLI, com três classes: contradição, implicação e neutro. Declara MIT. É um modelo genuíno com probabilidades, útil para grounding/reranking, mas não é uma implementação direta de Choice sobre classes arbitrárias. Probabilidade de implicação de cada hipótese não constitui automaticamente uma distribuição categórica sobre todas as alternativas. Seria um backend com capacidades específicas, não substituto transparente. [Model card](https://huggingface.co/AlexWortega/openjev).

`daseinlabs/open-jev` roda Gemma 3 4B via MLX, pontua continuações candidatas sem decodificá-las e expõe `/v1/systemone`. O README admite que sua confiança por entropia aproxima o formato TypeSafe; não demonstra equivalência estatística. É runtime para um modelo aberto existente, não novos pesos Jev. Requer Apple Silicon e acesso aos pesos Gemma; a licença do servidor não foi confirmada nesta pesquisa, portanto não é a recomendação principal para empacotamento. [Projeto](https://github.com/daseinlabs/open-jev).

Uma ferramenta que peça a um LLM “escreva JSON com confidence: 0.9” é outra categoria. Probabilidades calculadas a partir de logits também podem estar mal calibradas, mas têm uma origem mensurável; autodeclarações textuais não devem receber silenciosamente o mesmo significado no Sysone.

## Contrato sugerido para Sysone

Direções de design: parte do transporte e da validação já está implementada; declarações formais de capacidades e evidência de calibração continuam propostas.

- Separar backend e modelo; permitir endpoint local sem chamá-lo de Jev oficial.
- Declarar capacidades: primitivas suportadas, limites de alternativas/contexto, batch real, origem da distribuição e definição de confiança.
- Preservar distribuição bruta. Um campo de confiança ausente continua ausente; uma confiança `max_probability` não vira a métrica TypeSafe por renomeação.
- Normalizar Score como expectativa ordinal somente quando existir distribuição válida sobre níveis; não transformar notas inventadas em probabilidades.
- Tratar calibração como evidência por versão e domínio. Limiares configurados para Jev não migram automaticamente para Nimble, DeBERTa ou DiffusionGemma.
- Testar o adapter separadamente da qualidade do modelo: schema, labels, somas/ranges, limites, erros e identidade de resultados; depois avaliar tarefas representativas.

Para apresentação pública imediata, a frase precisa é: **“Sysone foi desenhado para decisões tipadas com diferentes backends. Modelos abertos como Nimble são candidatos a adapters locais experimentais.”** Nimble e Kotoba ainda não têm adapters próprios. OpenJev pode usar o transporte genérico experimental descrito abaixo. Não afirmar paridade com Jev nem pesos oficiais abertos.

## Sysone implementation status

Sysone 0.1.1 includes the experimental `sysone/providers/system-one` transport with configurable API base, optional authentication, cancellation and evidence validation. Contract fixtures cover OpenJev boolean, choice and score responses. The GPU inference backend has not been run by this project. The hosted playground still uses Jev through Vercel.

## Atualização da API em 0.2.0

A conexão agora é `systemOne({ baseURL, id: 'local' })`; a seleção é independente em `createSysone({ provider, model: 'openjev-latest' })`. Os providers são reutilizáveis por múltiplos modelos. Metadados adicionais do Gateway mantêm seus namespaces, sem assumir semântica TypeSafe para outros modelos. A pesquisa e os limites dos modelos acima permanecem os mesmos.
