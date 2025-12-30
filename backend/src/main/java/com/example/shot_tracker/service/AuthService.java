package com.example.shot_tracker.service;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    //Authorizationヘッダーからトークンを検証してUIDを返す
    public String verifyTokenAndGetUserId(String authHeader) throws Exception{
        if (authHeader == null || !authHeader.startsWith("Bearer")){
            throw new Exception("Invaild Authrozation header");
        }

        String idToken = authHeader.substring(7);

        try{
            //Firebaseに問い合わせて検証
            FirebaseToken decodeToken = FirebaseAuth.getInstance().verifyIdToken(idToken);
            return decodeToken.getUid();
        } catch (FirebaseAuthException e){
            throw new Exception("Token verification failed");
        }
    }
}