import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

// Vos credentials Supabase
const supabaseUrl = 'https://kebrjkzxyshxdfeenjke.supabase.co';  // ← Remplacez par votre URL
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtlYnJqa3p4eXNoeGRmZWVuamtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMzg5NDAsImV4cCI6MjA3OTkxNDk0MH0.dG_VW1dNIFdN_7Y0NKcQP3-uyzoV_mVhRiQDt39hIc4';  // ← Remplacez par votre clé

const supabase = createClient(supabaseUrl, supabaseKey);

async function hashAllPasswords() {
  console.log('🔐 Début du hashing des mots de passe...\n');

  try {
    // 1. Récupérer tous les utilisateurs
    const { data: users, error } = await supabase
      .from('users')
      .select('*');

    if (error) {
      console.error('❌ Erreur lors de la récupération des utilisateurs:', error);
      return;
    }

    console.log(`📋 ${users.length} utilisateurs trouvés\n`);

    // 2. Hasher chaque mot de passe
    for (const user of users) {
      console.log(`🔄 Traitement: ${user.username}...`);

      // Vérifier si le mot de passe est déjà hashé (commence par $2a$ ou $2b$)
      if (user.password && user.password.startsWith('$2')) {
        console.log(`   ⏭️  Déjà hashé, on passe\n`);
        continue;
      }

      // Hasher le mot de passe
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(user.password, salt);

      // Mettre à jour dans Supabase
      const { error: updateError } = await supabase
        .from('users')
        .update({ password: hashedPassword })
        .eq('id', user.id);

      if (updateError) {
        console.error(`   ❌ Erreur pour ${user.username}:`, updateError);
      } else {
        console.log(`   ✅ Mot de passe hashé!`);
        console.log(`   📝 Ancien: ${user.password}`);
        console.log(`   🔐 Nouveau: ${hashedPassword}\n`);
      }
    }

    console.log('🎉 Migration terminée avec succès!');
    process.exit(0);

  } catch (error) {
    console.error('💥 ERREUR:', error);
    process.exit(1);
  }
}

hashAllPasswords();