package com.intech.ai.controller;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "http://localhost:3000")
@RestController
@RequestMapping("/api/v1")
public class ChatController {

    private final ChatClient chatClient;

    public ChatController(ChatClient.Builder chatClientBuilder) {
        this.chatClient = chatClientBuilder.build();
    }


    @GetMapping("/chat")
    public String chat(@RequestParam("message") String message) {
        return chatClient.prompt(message).call().content();
    }

    @GetMapping("/test")
    public String testApi(@RequestParam("message") String message) {
        return "Hello "+ message;
    }

}